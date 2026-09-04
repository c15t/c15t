import { clearManifestCache } from '@c15t/core/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { c15tHandle } from '../handle';
import { loadConsent } from '../load-consent';
import type { C15tLocals } from '../types';
import { CONSENTED_COOKIE, createEvent } from './event';

const INIT_PAYLOAD = {
	branding: 'c15t',
	location: { countryCode: 'DE', regionCode: null },
	policy: {
		consent: { categories: ['necessary', 'marketing'], scopeMode: 'strict' },
		id: 'eu-opt-in',
		model: 'opt-in',
		ui: { mode: 'banner' },
	},
	policyDecision: {
		country: 'DE',
		fingerprint: 'eu-fingerprint',
		jurisdiction: 'GDPR',
		matchedBy: 'country',
		policyId: 'eu-opt-in',
		region: null,
	},
	translations: { language: 'de', translations: {} },
};

const jsonResponse = function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json' },
		status,
	});
};

/** Runs `c15tHandle` so `event.locals.c15t` is populated, as in a real app. */
const withHandle = async function withHandle(
	event: ReturnType<typeof createEvent>
) {
	await c15tHandle()({ event, resolve: () => Promise.resolve(new Response()) });
	return event;
};

describe('loadConsent', () => {
	beforeEach(() => {
		clearManifestCache();
	});

	test('reuses the config the handle already computed', async () => {
		const event = await withHandle(
			createEvent({
				headers: { cookie: CONSENTED_COOKIE, 'x-c15t-country': 'DE' },
			})
		);

		const config = await loadConsent(event);

		expect(config).toBe((event.locals as { c15t: C15tLocals }).c15t.config);
		expect(config.initialHasConsented).toBe(true);
		expect(config.initialOverrides?.country).toBe('DE');
	});

	test('falls back to reading the request itself when the handle is absent', async () => {
		const event = createEvent({
			headers: { 'cf-ipcountry': 'FR', cookie: CONSENTED_COOKIE },
		});

		const config = await loadConsent(event);

		expect(config.initialHasConsented).toBe(true);
		expect(config.initialOverrides?.country).toBe('FR');
	});

	test('manifest mode folds the same-origin init route into the config', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(INIT_PAYLOAD)));
		const event = createEvent({
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
			headers: { 'x-c15t-country': 'DE' },
		});

		const config = await loadConsent(event, { initRoute: '/api/c15t' });

		expect(fetchImpl).toHaveBeenCalledWith('/api/c15t', {
			headers: { 'x-c15t-country': 'DE' },
		});
		expect(config.initialPolicy?.id).toBe('eu-opt-in');
		expect(config.initialPolicyDecision?.policyId).toBe('eu-opt-in');
		expect(config.initialOverrides?.country).toBe('DE');
	});

	test('restates geo, language and GPC on the same-origin init call', async () => {
		// event.fetch only inherits cookie/authorization, so anything the init
		// route needs to resolve the policy has to be passed explicitly.
		const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(INIT_PAYLOAD)));
		const event = createEvent({
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
			headers: {
				'accept-language': 'de-DE,de;q=0.9',
				'cf-ipcountry': 'DE',
				'sec-gpc': '1',
			},
		});

		const config = await loadConsent(event, { initRoute: '/api/c15t' });

		expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual({
			'accept-language': 'de',
			'sec-gpc': '1',
			'x-c15t-country': 'DE',
		});
		expect(config.initialOverrides?.gpc).toBe(true);
	});

	test('option overrides reach the init route instead of the raw headers', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(INIT_PAYLOAD)));
		const event = createEvent({
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
			headers: { 'cf-ipcountry': 'DE' },
		});

		await loadConsent(event, {
			country: 'CA',
			initRoute: '/api/c15t',
			region: 'QC',
		});

		expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual({
			'x-c15t-country': 'CA',
			'x-c15t-region': 'QC',
		});
	});

	test('degrades to the cookie-only config when the init route fails', async () => {
		const event = createEvent({
			fetch: (() =>
				Promise.resolve(
					jsonResponse({}, 500)
				)) as unknown as typeof globalThis.fetch,
			headers: { cookie: CONSENTED_COOKIE },
		});

		const config = await loadConsent(event, { initRoute: '/api/c15t' });

		expect(config.initialHasConsented).toBe(true);
		expect(config.initialPolicy).toBeUndefined();
	});

	test('degrades to the cookie-only config when the init route throws', async () => {
		const event = createEvent({
			fetch: (() =>
				Promise.reject(
					new Error('offline')
				)) as unknown as typeof globalThis.fetch,
			headers: { cookie: CONSENTED_COOKIE },
		});

		const config = await loadConsent(event, { initRoute: '/api/c15t' });

		expect(config.initialHasConsented).toBe(true);
	});

	test('hosted mode calls the backend /init directly', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(INIT_PAYLOAD)));
		const event = createEvent({ headers: { 'cf-ipcountry': 'DE' } });

		const config = await loadConsent(event, {
			backendURL: 'https://api.example.com',
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
		});

		expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.example.com/init');
		expect(config.initialPolicy?.id).toBe('eu-opt-in');
	});

	test('returns the base config when no mode is configured', async () => {
		const event = createEvent({ headers: { 'cf-ipcountry': 'DE' } });

		const config = await loadConsent(event);

		expect(config).toEqual({ initialOverrides: { country: 'DE' } });
	});

	test('returns a JSON-serializable config', async () => {
		const event = createEvent({
			fetch: (() =>
				Promise.resolve(
					jsonResponse(INIT_PAYLOAD)
				)) as unknown as typeof globalThis.fetch,
			headers: { cookie: CONSENTED_COOKIE, 'x-c15t-country': 'DE' },
		});

		const config = await loadConsent(event, { initRoute: '/api/c15t' });

		expect(JSON.parse(JSON.stringify(config))).toEqual(config);
	});
});
