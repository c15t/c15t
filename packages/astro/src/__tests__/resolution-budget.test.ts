import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearManifestCache } from '../api';
import { resolveOptions } from '../integration';
import { hostedMode } from '../mode';
import { DEFAULT_RESOLVE_TIMEOUT_MS, resolveConsentContext } from '../server';
import type { C15tAstroOptions } from '../types';
import { testWire } from './policy-fixture';

const BACKEND = 'https://consent.example.com';

const initResponse = (): Response =>
	Response.json({
		branding: 'c15t',
		location: { countryCode: null, regionCode: null },
		policyResolution: testWire(),
		translations: { language: 'en', translations: {} },
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

	it('does not delay offline mode', async () => {
		const c15t = await resolveContext({
			middleware: { timeoutMs: 0 },
			mode: { type: 'offline' },
		});

		expect(c15t.hasPolicy).toBe(true);
	});
});
