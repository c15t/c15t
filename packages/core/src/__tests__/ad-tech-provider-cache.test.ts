/**
 * The manifest-mode provider loader must never hold an init open: the
 * Additional Consent string only supplements the TC String, so a stalled
 * list endpoint gives up after the request deadline.
 */
import { AD_TECH_PROVIDER_FETCH_TIMEOUT_MS } from '@c15t/schema/types';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	clearAdTechProviderCache,
	fetchCachedAdTechProviders,
} from '../transports/ad-tech-provider-cache';
import type { AdTechProviderCache } from '../transports/ad-tech-provider-cache';

const META = { id: 89, name: 'Meta', policyUrl: 'https://meta.example/p' };
const reference = { providers: [89], url: 'https://lists.example/ac' };

/** A fetch that never answers and rejects only when its signal aborts. */
const stalled = vi.fn(
	(_input: RequestInfo | URL, init?: RequestInit) =>
		new Promise<Response>((_resolve, reject) => {
			init?.signal?.addEventListener('abort', () =>
				reject(init.signal?.reason)
			);
		})
);

const unavailable = () => Promise.resolve(new Response('', { status: 503 }));

/** A fetch that answers with the given providers in the list's shape. */
const listing = (...providers: (typeof META)[]) =>
	(() =>
		Promise.resolve(
			Response.json({
				providers: Object.fromEntries(
					providers.map((provider) => [String(provider.id), provider])
				),
			})
		)) as unknown as typeof globalThis.fetch;

/** Replaces the request deadline with one the test fires. */
const controlDeadline = () => {
	const deadline = new AbortController();
	const timeout = vi
		.spyOn(AbortSignal, 'timeout')
		.mockReturnValue(deadline.signal);
	const expire = () =>
		deadline.abort(
			new DOMException('The operation timed out.', 'TimeoutError')
		);
	return { expire, timeout };
};

describe('fetchCachedAdTechProviders', () => {
	afterEach(() => {
		clearAdTechProviderCache();
		vi.restoreAllMocks();
	});

	test('answers an empty provider list without asking the endpoint', async () => {
		const fetch = vi.fn(unavailable);
		const providers = await fetchCachedAdTechProviders({
			cache: new Map(),
			fetch: fetch as unknown as typeof globalThis.fetch,
			reference: { providers: [], url: reference.url },
		});
		// `[]`, not `undefined`: it withdraws the providers a client holds.
		expect(providers).toEqual([]);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('keeps at most 32 lists, dropping the oldest', async () => {
		const cache: AdTechProviderCache = new Map();
		// One after another, so the first list is the oldest.
		await Array.from({ length: 40 }, (_, index) => index + 1).reduce(
			(previous, id) =>
				previous.then(() =>
					fetchCachedAdTechProviders({
						cache,
						fetch: listing({ ...META, id }),
						reference: { providers: [id], url: reference.url },
					})
				),
			Promise.resolve<unknown>(undefined)
		);
		expect(cache.size).toBe(32);
		expect(cache.has(`${reference.url}|1`)).toBe(false);
		expect(cache.has(`${reference.url}|40`)).toBe(true);
	});

	test('gives up on a stalled list with nothing cached', async () => {
		const { expire, timeout } = controlDeadline();
		const pending = fetchCachedAdTechProviders({
			cache: new Map(),
			fetch: stalled as unknown as typeof globalThis.fetch,
			reference,
		});
		expect(timeout).toHaveBeenCalledWith(AD_TECH_PROVIDER_FETCH_TIMEOUT_MS);
		expire();
		await expect(pending).resolves.toBeUndefined();
	});

	test('serves the last good list when a refresh stalls', async () => {
		const cache: AdTechProviderCache = new Map([
			[
				`${reference.url}|89`,
				{ expiresAt: 1000, providers: [META], staleUntil: 5000 },
			],
		]);
		const { expire } = controlDeadline();
		const pending = fetchCachedAdTechProviders({
			cache,
			fetch: stalled as unknown as typeof globalThis.fetch,
			now: 2000,
			reference,
		});
		expire();
		await expect(pending).resolves.toEqual([META]);
	});

	test('stops serving a list past its stale period', async () => {
		const cache: AdTechProviderCache = new Map([
			[
				`${reference.url}|89`,
				{ expiresAt: 1000, providers: [META], staleUntil: 5000 },
			],
		]);
		const providers = await fetchCachedAdTechProviders({
			cache,
			fetch: unavailable as unknown as typeof globalThis.fetch,
			now: 6000,
			reference,
		});
		expect(providers).toBeUndefined();
	});

	test('serves the last good list without refetching for a minute after a failed refresh', async () => {
		const cache: AdTechProviderCache = new Map([
			[
				`${reference.url}|89`,
				{ expiresAt: 1000, providers: [META], staleUntil: 10_000_000 },
			],
		]);
		const load = (now: number, fetch: typeof globalThis.fetch) =>
			fetchCachedAdTechProviders({ cache, fetch, now, reference });
		const down = vi.fn(unavailable) as unknown as typeof globalThis.fetch;

		await expect(load(2000, down)).resolves.toEqual([META]);
		await expect(load(2000 + 59_000, down)).resolves.toEqual([META]);
		expect(down).toHaveBeenCalledTimes(1);

		const NEW = { id: 89, name: 'Meta Platforms', policyUrl: META.policyUrl };
		await expect(load(2000 + 61_000, listing(NEW))).resolves.toEqual([NEW]);
	});

	test('waits a minute before retrying an endpoint that failed with nothing cached', async () => {
		const cache: AdTechProviderCache = new Map();
		const down = vi.fn(unavailable) as unknown as typeof globalThis.fetch;
		const load = (now: number, fetch: typeof globalThis.fetch) =>
			fetchCachedAdTechProviders({ cache, fetch, now, reference });

		await expect(load(0, down)).resolves.toBeUndefined();
		await expect(load(30_000, down)).resolves.toBeUndefined();
		expect(down).toHaveBeenCalledTimes(1);
		await expect(load(61_000, listing(META))).resolves.toEqual([META]);
	});

	test('does not stretch a stale list past its bound while backing off', async () => {
		const cache: AdTechProviderCache = new Map([
			[
				`${reference.url}|89`,
				{ expiresAt: 1000, providers: [META], staleUntil: 30_000 },
			],
		]);
		const down = unavailable as unknown as typeof globalThis.fetch;
		const load = (now: number) =>
			fetchCachedAdTechProviders({ cache, fetch: down, now, reference });

		await expect(load(2000)).resolves.toEqual([META]);
		await expect(load(31_000)).resolves.toBeUndefined();
	});

	test('keeps a relative endpoint apart for each fetch that resolves it', async () => {
		const relative = { providers: [89], url: '/api/c15t/additional-consent' };
		const TENANT_A = { ...META, name: 'Meta (tenant A)' };
		const TENANT_B = { ...META, name: 'Meta (tenant B)' };
		const tenantA = listing(TENANT_A);
		const tenantB = listing(TENANT_B);

		const [a, b] = await Promise.all([
			fetchCachedAdTechProviders({ fetch: tenantA, reference: relative }),
			fetchCachedAdTechProviders({ fetch: tenantB, reference: relative }),
		]);
		expect(a).toEqual([TENANT_A]);
		expect(b).toEqual([TENANT_B]);
		await expect(
			fetchCachedAdTechProviders({ fetch: tenantB, reference: relative })
		).resolves.toEqual([TENANT_B]);
	});

	test('shares an absolute endpoint across fetch implementations', async () => {
		const first = vi.fn(listing(META)) as unknown as typeof globalThis.fetch;
		const second = vi.fn(listing(META)) as unknown as typeof globalThis.fetch;
		await fetchCachedAdTechProviders({ fetch: first, reference });
		await expect(
			fetchCachedAdTechProviders({ fetch: second, reference })
		).resolves.toEqual([META]);
		expect(second).not.toHaveBeenCalled();
	});
});
