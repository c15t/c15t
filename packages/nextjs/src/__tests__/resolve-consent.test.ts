/**
 * Wiring tests for `resolveConsent` on top of `resolveRequestConsent` from
 * `@c15t/core/server`. The resolution rules themselves (forwarding, budget,
 * self-route guard, deferral, experiment, shared renders) are pinned once in
 * the core suite; these check what the Next.js adapter supplies: the
 * request adapter's headers and cookies, the `config` routes, and the
 * development warning.
 */
import { clearManifestCache } from '@c15t/core/transports/manifest-cache';
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
		expect(String(fetch.mock.calls[0]?.[0])).toBe(
			'https://consent.example.com/init'
		);
		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		expect(headers.get('x-c15t-country')).toBe('FR');
		expect(headers.get('accept-language')).toBe('de');
		expect(headers.get('cookie')).toBe('c15t=x');
		expect(state.initialPolicyResolution?.status).toBe('matched');
	});

	test('never fetches its own /api/c15t route, and says so outside production', async () => {
		const fetch = backend();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const state = await resolveConsent({
			backendURL: '/api/c15t',
			fetch,
			request: requestOf({}),
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(state.initialPolicyResolution).toBeUndefined();
		expect(String(warn.mock.calls[0]?.[0])).toContain(
			'https://app.example.com/api/c15t/init'
		);
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
