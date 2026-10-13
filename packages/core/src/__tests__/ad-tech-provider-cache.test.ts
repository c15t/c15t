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
		const key = `${reference.url}|89`;
		const cache: AdTechProviderCache = new Map([
			[key, { expiresAt: 1000, providers: [META], staleUntil: 5000 }],
		]);
		const providers = await fetchCachedAdTechProviders({
			cache,
			fetch: (() =>
				Promise.resolve(
					new Response('', { status: 503 })
				)) as unknown as typeof globalThis.fetch,
			now: 6000,
			reference,
		});
		expect(providers).toBeUndefined();
		expect(cache.has(key)).toBe(false);
	});
});
