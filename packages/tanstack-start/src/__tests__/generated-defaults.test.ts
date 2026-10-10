/**
 * The quickstart passes no options: `createConsentStateHandler()` and
 * `createConsentRoute()` read the backend URL and the policy snapshot from
 * `@c15t/core/generated`, which `consentManifest()` serves, and the state
 * hands the browser everything `ConsentRoot` needs.
 */
import { createManifestCache } from '@c15t/core/server';
import { describe, expect, test, vi } from 'vitest';

import { createConsentRoute } from '../api';
import { createConsentStateHandler, resolveConsent } from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

// oxlint-disable-next-line anti-slop/no-module-mocking -- Stands in for the virtual module the Vite plugin serves.
vi.mock('@c15t/core/generated', async () => {
	const { MANIFEST_FIXTURE: snapshot } = await import('./manifest-fixture');
	return { backendURL: 'https://consent.example.com', snapshot };
});

const requestOf = (headers: Record<string, string> = {}) =>
	new Request('https://app.example.com/', { headers });

const offlineFetch = () =>
	vi.fn<typeof globalThis.fetch>(() =>
		Promise.reject(new Error('no request expected'))
	);

describe('defaults from @c15t/core/generated', () => {
	test('the state handler resolves the build snapshot and carries the backend', async () => {
		const fetch = offlineFetch();
		const state = await createConsentStateHandler({
			fetch,
			reportSessions: false,
			request: requestOf({ 'x-vercel-ip-country': 'DE' }),
		})();
		expect(state.initialPolicyResolution).toMatchObject({
			policyId: 'eu-opt-in',
			status: 'matched',
		});
		expect(state.backendURL).toBe('https://consent.example.com');
		expect(state).not.toHaveProperty('mode');
		expect(state).not.toHaveProperty('routePrefix');
		expect(fetch).not.toHaveBeenCalled();
	});

	test('the consent route serves the build snapshot', async () => {
		const fetch = offlineFetch();
		const { GET } = createConsentRoute({ fetch, reportSessions: false });
		const response = await GET({
			params: { _splat: 'manifest' },
			request: new Request('https://app.example.com/api/c15t/manifest'),
		});
		expect(await response.json()).toEqual(MANIFEST_FIXTURE);
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe('the client half of the state', () => {
	test('carries the mode and route prefix, never the snapshot', async () => {
		const state = await resolveConsent({
			mode: {
				manifestURL: 'https://cdn.example/manifest',
				snapshot: MANIFEST_FIXTURE,
				type: 'manifest',
			},
			reportSessions: false,
			request: requestOf({ 'x-vercel-ip-country': 'DE' }),
			routePrefix: '/api/c15t/',
		});
		expect(state.initialPolicyResolution).toMatchObject({
			policyId: 'eu-opt-in',
		});
		expect(state.mode).toEqual({
			manifestURL: 'https://cdn.example/manifest',
			type: 'manifest',
		});
		expect(state.routePrefix).toBe('/api/c15t');
		expect(JSON.stringify(state)).not.toContain(MANIFEST_FIXTURE.revision);
	});

	test('proxy sends saves through the route prefix', async () => {
		const state = await resolveConsent({
			proxy: true,
			reportSessions: false,
			request: requestOf(),
			routePrefix: '/api/c15t',
		});
		expect(state).toMatchObject({
			backendURL: '/api/c15t',
			routePrefix: '/api/c15t',
		});
		await expect(
			resolveConsent({ proxy: true, request: requestOf() })
		).rejects.toThrow('needs `routePrefix`');
	});

	test("proxy keeps hosted()'s backend URL on the server", async () => {
		const fetch = offlineFetch();
		const state = await resolveConsent({
			fetch,
			mode: { backendURL: 'https://backend.example', type: 'hosted' },
			proxy: true,
			reportSessions: false,
			request: requestOf({ 'x-vercel-ip-country': 'DE' }),
			routePrefix: '/api/c15t',
		});
		// The browser's init and saves go through the route.
		expect(state).toMatchObject({
			backendURL: '/api/c15t',
			mode: { type: 'hosted' },
		});
		expect(state.mode).not.toHaveProperty('backendURL');
		// The server still asks the hosted backend.
		expect(String(fetch.mock.calls[0]?.[0])).toMatch(
			/^https:\/\/backend\.example\/init/u
		);
	});

	test('browser resolution leaves the policy to ConsentRoot', async () => {
		const fetch = offlineFetch();
		const state = await resolveConsent({
			cache: createManifestCache(),
			fetch,
			mode: { resolve: 'browser', type: 'manifest' },
			request: requestOf({ 'x-vercel-ip-country': 'DE' }),
		});
		expect(state.initialPolicyResolution).toBeUndefined();
		expect(state.mode).toEqual({ resolve: 'browser', type: 'manifest' });
		expect(fetch).not.toHaveBeenCalled();
	});

	test('offline() resolves bundled rules on the server', async () => {
		const state = await resolveConsent({
			mode: { type: 'offline' },
			request: requestOf({ 'x-vercel-ip-country': 'DE' }),
		});
		expect(state.initialPolicyResolution?.status).toBe('matched');
		expect(state.mode).toEqual({ type: 'offline' });
	});
});
