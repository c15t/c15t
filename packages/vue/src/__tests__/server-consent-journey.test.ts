/**
 * The consent journey a Nuxt server render starts. The browser runtime is
 * always `'page'`, so the render reports `'page'` too, and
 * `reportSessions: false` tells the browser the page has no journey.
 */
import { afterEach, expect, test, vi } from 'vitest';

import { resolveNuxtConsent } from '../runtime/server-consent';

const backend = () =>
	vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
		Promise.resolve(
			Response.json(
				{ translations: { language: 'en', translations: {} } },
				{ headers: { 'x-c15t-policy-contract': '1' } }
			)
		)
	);

const request = { headers: {}, url: 'https://shop.example.com/' };

afterEach(() => {
	vi.unstubAllGlobals();
});

test('a render starts a page journey and sends it on the hosted /init', async () => {
	const fetch = backend();
	vi.stubGlobal('fetch', fetch);
	const state = await resolveNuxtConsent(
		{ backendURL: 'https://consent.example.com', mode: { type: 'hosted' } },
		request
	);
	const sent = new URL(String(fetch.mock.calls[0]?.[0]));
	expect(sent.searchParams.get('journey')).toBe(state.journey?.id);
	expect(sent.searchParams.get('journeyScope')).toBe('page');
});

test('reportSessions: false tells the browser the page has no journey', async () => {
	const fetch = backend();
	vi.stubGlobal('fetch', fetch);
	const state = await resolveNuxtConsent(
		{
			backendURL: 'https://consent.example.com',
			mode: { type: 'hosted' },
			reportSessions: false,
		},
		request
	);
	expect(state.journey).toBeNull();
	expect(String(fetch.mock.calls[0]?.[0])).not.toContain('journey');
});

test('manifest() without a consent route reads the manifest itself', async () => {
	const fetch = backend();
	vi.stubGlobal('fetch', fetch);
	await resolveNuxtConsent(
		{ backendURL: 'https://consent.example.com', routePrefix: false },
		request
	);
	expect(String(fetch.mock.calls[0]?.[0])).toBe(
		'https://consent.example.com/manifest'
	);
});
