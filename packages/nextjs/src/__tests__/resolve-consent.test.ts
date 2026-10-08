/**
 * Wiring tests for `resolveConsent` on top of `resolveRequestConsent` from
 * `@c15t/core/server`. The resolution rules themselves (forwarding, budget,
 * self-route guard, deferral, experiment, shared renders) are pinned once in
 * the core suite; these check what the Next.js adapter supplies: the
 * request adapter's headers and cookies, the `config` routes, and the
 * development warning.
 */
import { clearManifestCache } from '@c15t/core/server';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { defineConsentConfig } from '../config';
import { resolveConsent } from '../server';
import type { NextRequestContext } from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const INIT = {
	branding: 'c15t',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: 'DE',
			regionCode: null,
			rules: [
				{
					id: 'gdpr',
					match: { isDefault: true },
					model: 'opt-in',
					prompt: 'choice',
				},
			],
		})
	),
	translations: { language: 'en', translations: {} },
};

const answer = (body: unknown) =>
	Promise.resolve(
		new Response(JSON.stringify(body), {
			headers: {
				'content-type': 'application/json',
				'x-c15t-policy-contract': '1',
			},
		})
	);

const backend = () =>
	vi.fn<typeof globalThis.fetch>((input) =>
		answer(String(input).endsWith('/manifest') ? MANIFEST_FIXTURE : INIT)
	);

const requestOf = (
	headers: Record<string, string>,
	cookie = ''
): NextRequestContext => ({
	cookies: () => ({ toString: () => cookie }),
	headers: () => new Headers({ host: 'app.example.com', ...headers }),
});

beforeEach(() => {
	clearManifestCache();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('resolveConsent wiring', () => {
	test('a same-origin config manifest route is read at the backend, not fetched', async () => {
		const fetch = backend();
		const state = await resolveConsent({
			config: defineConsentConfig({
				backendURL: 'https://consent.example.com',
				initURL: '/api/consent/init',
				manifestURL: '/api/consent/manifest',
			}),
			fetch,
			reportSessions: false,
			request: requestOf({ 'x-vercel-ip-country': 'DE' }),
		});
		expect(fetch.mock.calls.map(([input]) => String(input))).toEqual([
			'https://consent.example.com/manifest',
		]);
		expect(fetch.mock.calls[0]?.[1]).toMatchObject({
			next: { revalidate: 300 },
		});
		expect(state.initialPolicyResolution).toMatchObject({
			policyId: 'eu-opt-in',
			status: 'matched',
		});
	});

	test('a config without manifestURL asks the backend /init with the request inputs', async () => {
		const fetch = backend();
		const state = await resolveConsent({
			config: defineConsentConfig({
				backendURL: 'https://consent.example.com',
			}),
			country: 'FR',
			fetch,
			request: requestOf({ 'accept-language': 'de-DE' }, 'c15t=x; session=y'),
		});
		// The query carries the consent journey the render started.
		expect(String(fetch.mock.calls[0]?.[0]).split('?')[0]).toBe(
			'https://consent.example.com/init'
		);
		expect(fetch.mock.calls[0]?.[1]?.cache).toBe('no-store');
		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		expect(headers.get('x-c15t-country')).toBe('FR');
		expect(headers.get('accept-language')).toBe('de');
		expect(headers.get('cookie')).toBe('c15t=x');
		expect(state.initialPolicyResolution?.status).toBe('matched');
	});

	test('a /api/c15t backend prefix (rewrite or mounted backend) is asked for /init', async () => {
		// Next.js mounts no c15t handler at /api/c15t: the docs use it as the
		// backend prefix, through a rewrite or a backend catch-all route.
		const fetch = backend();
		const state = await resolveConsent({
			backendURL: '/api/c15t',
			fetch,
			request: requestOf({ 'x-vercel-ip-country': 'DE' }),
		});
		expect(
			fetch.mock.calls.map(([input]) => String(input).split('?')[0])
		).toEqual(['https://app.example.com/api/c15t/init']);
		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		expect(headers.get('x-c15t-country')).toBe('DE');
		expect(state.initialPolicyResolution?.status).toBe('matched');
	});

	test('a render reached by another render’s own request does not fetch its origin again', async () => {
		const fetch = backend();
		const first = await resolveConsent({
			backendURL: '/api/c15t',
			fetch,
			request: requestOf({}),
		});
		expect(first.initialPolicyResolution?.status).toBe('matched');
		// An unmounted prefix answers with a page whose layout resolves again,
		// carrying the headers the first render sent.
		const sent = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const nested = await resolveConsent({
			backendURL: '/api/c15t',
			fetch,
			request: requestOf(Object.fromEntries(sent)),
		});
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(nested.initialPolicyResolution).toBeUndefined();
		expect(String(warn.mock.calls[0]?.[0])).toContain(
			'https://app.example.com/api/c15t/init'
		);
	});

	test('never fetches the config’s own handler routes, and says so outside production', async () => {
		const fetch = backend();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const config = defineConsentConfig({
			backendURL: '/api/c15t',
			manifestURL: '/api/c15t/manifest',
		});
		const state = await resolveConsent({
			config,
			fetch,
			request: requestOf({}),
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(state.initialPolicyResolution).toBeUndefined();
		expect(String(warn.mock.calls[0]?.[0])).toContain(
			'https://app.example.com/api/c15t/manifest'
		);
		// The handler's own upstream resolves it, as the docs describe.
		const resolved = await resolveConsent({
			backendURL: 'https://consent.example.com',
			config,
			fetch,
			reportSessions: false,
			request: requestOf({ 'x-vercel-ip-country': 'DE' }),
		});
		expect(fetch.mock.calls.map(([input]) => String(input))).toEqual([
			'https://consent.example.com/manifest',
		]);
		expect(resolved.initialPolicyResolution?.status).toBe('matched');
	});

	test('onError replaces the warning; production stays quiet', async () => {
		const failing = vi.fn<typeof globalThis.fetch>(() =>
			Promise.reject(new Error('network down'))
		);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const onError = vi.fn();
		await resolveConsent({
			backendURL: 'https://consent.example.com',
			fetch: failing,
			onError,
			request: requestOf({}),
		});
		expect(onError).toHaveBeenCalledTimes(1);
		expect(String(onError.mock.calls[0]?.[0])).toContain('network down');
		vi.stubGlobal('process', { env: { NODE_ENV: 'production' } });
		await resolveConsent({
			backendURL: 'https://consent.example.com',
			fetch: failing,
			request: requestOf({}),
		});
		expect(warn).not.toHaveBeenCalled();
	});

	test('reads cookies() when the headers carry none, and keeps the experiment', async () => {
		const experiment = {
			arm: 'b',
			arms: [{ id: 'a' }, { id: 'b' }],
			id: 'banner',
		} as unknown as NonNullable<
			Parameters<typeof resolveConsent>[0]
		>['experiment'];
		const fetch = backend();
		const state = await resolveConsent({
			backendURL: 'https://consent.example.com',
			experiment,
			fetch,
			request: {
				cookies: () => ({ toString: () => 'c15t=x' }),
				headers: () => new Headers({ host: 'app.example.com' }),
			},
		});
		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		expect(headers.get('cookie')).toBe('c15t=x');
		expect(state.experiment).toBe(experiment);
	});
});
