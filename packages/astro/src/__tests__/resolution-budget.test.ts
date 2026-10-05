import { buildConsentManifestFromConfig } from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearManifestCache } from '../api';
import { resolveOptions } from '../integration';
import { hostedMode, manifestMode } from '../mode';
import { DEFAULT_RESOLVE_TIMEOUT_MS, resolveConsentContext } from '../server';
import type { C15tAstroOptions } from '../types';
import { testRule, testWire } from './policy-fixture';

const BACKEND = 'https://consent.example.com';

const MANIFEST = await buildConsentManifestFromConfig({
	branding: 'c15t',
	policyRules: [testRule],
});

const initResponse = (): Response =>
	Response.json({
		branding: 'c15t',
		location: { countryCode: null, regionCode: null },
		policyResolution: testWire(),
		translations: { language: 'en', translations: {} },
	});

const manifestResponse = (): Response =>
	new Response(JSON.stringify(MANIFEST), {
		headers: {
			'cache-control': 'public, s-maxage=300',
			'content-type': 'application/json',
			etag: '"manifest-1"',
		},
		status: 200,
	});

/** A fetch whose response arrives only when the test says so. */
const heldFetch = function heldFetch(respond: () => Response) {
	const calls: { url: string; signal?: AbortSignal | null }[] = [];
	const releases: (() => void)[] = [];
	const fetchImpl = vi.fn(
		(input: string | URL | Request, init?: RequestInit) => {
			calls.push({ signal: init?.signal, url: String(input) });
			// oxlint-disable-next-line promise/avoid-new -- A request the test releases by hand.
			return new Promise<Response>((resolve) => {
				releases.push(() => resolve(respond()));
			});
		}
	);
	return {
		calls,
		fetch: fetchImpl as unknown as typeof globalThis.fetch,
		release() {
			for (const release of releases.splice(0)) {
				release();
			}
		},
	};
};

const resolveContext = (
	astroOptions: C15tAstroOptions,
	extra: Partial<Parameters<typeof resolveConsentContext>[0]> = {}
) =>
	resolveConsentContext({
		headers: new Headers({ 'x-c15t-country': 'DE' }),
		options: resolveOptions(astroOptions),
		url: 'https://site.example.com/',
		...extra,
	});

afterEach(() => {
	vi.useRealTimers();
	clearManifestCache();
});

describe('server resolution budget', () => {
	it('defaults to 500 ms', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		const backend = heldFetch(initResponse);
		let settled = false;
		const pending = resolveContext(
			{ mode: hostedMode({ url: BACKEND }) },
			{ fetch: backend.fetch }
		).then((value) => {
			settled = true;
			return value;
		});

		await vi.advanceTimersByTimeAsync(DEFAULT_RESOLVE_TIMEOUT_MS - 1);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		const c15t = await pending;

		expect(DEFAULT_RESOLVE_TIMEOUT_MS).toBe(500);
		expect(c15t.hasPolicy).toBe(false);
		expect(c15t.shouldShowBanner).toBe(false);
		expect(c15t.config.initialPolicyPending).toBe(true);
	});

	it('renders without a server decision when hosted /init hangs', async () => {
		const backend = heldFetch(initResponse);
		const started = Date.now();
		const c15t = await resolveContext(
			{ middleware: { timeoutMs: 40 }, mode: hostedMode({ url: BACKEND }) },
			{ fetch: backend.fetch }
		);

		expect(Date.now() - started).toBeLessThan(1000);
		expect(backend.calls).toHaveLength(1);
		expect(backend.calls[0]?.url).toBe(`${BACKEND}/init`);
		// The request is cancelled, not left open.
		expect(backend.calls[0]?.signal).toBeInstanceOf(AbortSignal);
		expect(c15t.hasPolicy).toBe(false);
		expect(c15t.config.initialPolicyPending).toBe(true);
		// Nothing optional is granted without a policy.
		expect(c15t.snapshot.effectivePermissions.marketing).toBe(false);
		expect(c15t.snapshot.effectivePermissions.measurement).toBe(false);
	});

	it('still uses an answer that arrives inside the budget', async () => {
		const c15t = await resolveContext(
			{ middleware: { timeoutMs: 1000 }, mode: hostedMode({ url: BACKEND }) },
			{ fetch: vi.fn(() => Promise.resolve(initResponse())) as never }
		);

		expect(c15t.hasPolicy).toBe(true);
		expect(c15t.shouldShowBanner).toBe(true);
	});

	it('waits for the backend with timeoutMs: false', async () => {
		const backend = heldFetch(initResponse);
		const pending = resolveContext(
			{ middleware: { timeoutMs: false }, mode: hostedMode({ url: BACKEND }) },
			{ fetch: backend.fetch }
		);
		// oxlint-disable-next-line promise/avoid-new -- Let the budget pass.
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 60);
		});
		expect(backend.calls[0]?.signal ?? undefined).toBeUndefined();
		backend.release();

		expect((await pending).hasPolicy).toBe(true);
	});

	it('lets a per-call timeoutMs override the integration option', async () => {
		const backend = heldFetch(initResponse);
		const started = Date.now();
		const c15t = await resolveContext(
			{ middleware: { timeoutMs: false }, mode: hostedMode({ url: BACKEND }) },
			{ fetch: backend.fetch, timeoutMs: 30 }
		);

		expect(Date.now() - started).toBeLessThan(1000);
		expect(c15t.hasPolicy).toBe(false);
	});

	it('keeps a slow manifest fill alive and serves it to the next render', async () => {
		const backend = heldFetch(manifestResponse);
		const background: Promise<void>[] = [];
		const astroOptions: C15tAstroOptions = {
			middleware: { timeoutMs: 40 },
			mode: manifestMode({ backendURL: BACKEND }),
		};

		const first = await resolveContext(astroOptions, {
			fetch: backend.fetch,
			onBackgroundRevalidate: (task) => background.push(task),
		});
		const manifestCalls = () =>
			backend.calls.filter(({ url }) => url.endsWith('/manifest'));
		expect(first.hasPolicy).toBe(false);
		expect(manifestCalls()).toHaveLength(1);
		expect(background.length).toBeGreaterThan(0);

		backend.release();
		await Promise.all(background);

		const second = await resolveContext(astroOptions, { fetch: backend.fetch });
		expect(second.hasPolicy).toBe(true);
		expect(second.shouldShowBanner).toBe(true);
		// Served from the cache the first render's request filled.
		expect(manifestCalls()).toHaveLength(1);
	});

	it('leaves the session report to the init route once the render gives up', async () => {
		const manifest = heldFetch(manifestResponse);
		const reports: string[] = [];
		const fetchImpl = vi.fn(
			(input: string | URL | Request, init?: RequestInit) => {
				if (String(input).endsWith('/sessions')) {
					reports.push(String(init?.body));
					return Promise.resolve(new Response(null, { status: 204 }));
				}
				return manifest.fetch(input, init);
			}
		) as unknown as typeof globalThis.fetch;
		const background: Promise<void>[] = [];
		const astroOptions: C15tAstroOptions = {
			middleware: { timeoutMs: 40 },
			mode: manifestMode({ backendURL: BACKEND }),
		};
		const onBackgroundRevalidate = (task: Promise<void>) => {
			background.push(task);
		};

		const first = await resolveContext(astroOptions, {
			fetch: fetchImpl,
			onBackgroundRevalidate,
		});
		expect(first.config.initialPolicyPending).toBe(true);
		manifest.release();
		await Promise.all(background);
		// The browser resolves this view through the init route, which
		// reports it; the render that gave up sends nothing.
		expect(reports).toHaveLength(0);

		const second = await resolveContext(astroOptions, {
			fetch: fetchImpl,
			onBackgroundRevalidate,
		});
		await Promise.all(background);
		expect(second.hasPolicy).toBe(true);
		expect(reports).toHaveLength(1);
		expect(JSON.parse(reports[0] as string)).toMatchObject({
			source: 'render',
		});
	});

	it('does not delay offline mode', async () => {
		const c15t = await resolveContext({
			middleware: { timeoutMs: 0 },
			mode: { type: 'offline' },
		});

		expect(c15t.hasPolicy).toBe(true);
	});
});
