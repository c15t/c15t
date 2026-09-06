/**
 * Tests for readInitialConsentConfig, the server-only helper that
 * produces a KernelConfig from the incoming TanStack Start request.
 *
 * Each test builds a plain `Request`, which is exactly what `getRequest()`
 * hands the helper at runtime.
 */

import { createServerFn } from '@tanstack/react-start';
import { describe, expect, expectTypeOf, test } from 'vitest';

import {
	createConsentConfigHandler,
	readInitialConsentConfig as baseReadInitialConsentConfig,
} from '../server';
import type { ConsentConfig } from '../server';

const createRequest = function createRequest(
	headers: Record<string, string> = {}
) {
	return new Request('https://app.example.com/', { headers });
};

const readInitialConsentConfig = (
	headers: Record<string, string> = {},
	options: Omit<
		NonNullable<Parameters<typeof baseReadInitialConsentConfig>[0]>,
		'request'
	> = {}
) =>
	baseReadInitialConsentConfig({ ...options, request: createRequest(headers) });

describe('readInitialConsentConfig: cookies', () => {
	test('returns empty config when nothing is present', async () => {
		expect(await readInitialConsentConfig()).toEqual({});
	});

	test('reads the compact persistence module cookie', async () => {
		// Returning visitors must not get the banner re-rendered into the
		// first HTML: the server has to see what the client persisted.
		const config = await readInitialConsentConfig({
			cookie: 'c15t=c.necessary:1,c.marketing:1,c.measurement:0,i.t:1234567890',
		});
		expect(config.initialHasConsented).toBe(true);
		expect(config.initialConsents).toMatchObject({
			marketing: true,
			measurement: false,
			necessary: true,
		});
	});

	test('ignores malformed cookie values', async () => {
		const config = await readInitialConsentConfig({
			cookie: 'c15t=not-a-consent-payload',
		});
		expect(config.initialConsents).toBeUndefined();
		expect(config.initialHasConsented).toBeUndefined();
	});

	test('respects a customized storage key', async () => {
		const config = await readInitialConsentConfig(
			{ cookie: 'my-consent=c.necessary:1,c.marketing:1,i.t:1' },
			{ cookieName: 'my-consent' }
		);
		expect(config.initialHasConsented).toBe(true);
		expect(config.initialConsents).toMatchObject({ marketing: true });
	});

	test('accepts a request factory', async () => {
		const config = await baseReadInitialConsentConfig({
			request: () => createRequest({ 'x-c15t-country': 'FR' }),
		});
		expect(config.initialOverrides?.country).toBe('FR');
	});
});

describe('readInitialConsentConfig: geo headers', () => {
	test('uses x-vercel-ip-country', async () => {
		const config = await readInitialConsentConfig({
			'x-vercel-ip-country': 'DE',
		});
		expect(config.initialOverrides?.country).toBe('DE');
	});

	test('x-c15t-country from the middleware wins over CDN headers', async () => {
		const config = await readInitialConsentConfig({
			'cf-ipcountry': 'FR',
			'x-c15t-country': 'DE',
		});
		expect(config.initialOverrides?.country).toBe('DE');
	});

	test('reads region when present', async () => {
		const config = await readInitialConsentConfig({
			'x-vercel-ip-country': 'US',
			'x-vercel-ip-country-region': 'CA',
		});
		expect(config.initialOverrides).toMatchObject({
			country: 'US',
			region: 'CA',
		});
	});

	test('options.country overrides the header', async () => {
		const config = await readInitialConsentConfig(
			{ 'x-vercel-ip-country': 'US' },
			{ country: 'DE' }
		);
		expect(config.initialOverrides?.country).toBe('DE');
	});
});

describe('readInitialConsentConfig: language and GPC', () => {
	test('negotiates the first language from accept-language', async () => {
		const config = await readInitialConsentConfig({
			'accept-language': 'de-DE,de;q=0.9,en;q=0.5',
		});
		expect(config.initialOverrides?.language).toBe('de');
	});

	test('options.language overrides the header', async () => {
		const config = await readInitialConsentConfig(
			{ 'accept-language': 'de' },
			{ language: 'fr' }
		);
		expect(config.initialOverrides?.language).toBe('fr');
	});

	test('reads sec-gpc', async () => {
		const config = await readInitialConsentConfig({ 'sec-gpc': '1' });
		expect(config.initialOverrides?.gpc).toBe(true);
	});
});

describe('createConsentConfigHandler: server function contract', () => {
	test('is accepted by createServerFn().handler() as-is', () => {
		// Compile-time regression guard for the documented root-route pattern.
		// TanStack Start validates that a server function's return type is
		// serializable; `KernelConfig.transport` holds functions, so returning
		// the full `KernelConfig` fails type-checking. The helpers must return
		// the narrower `ConsentConfig`.
		const getConsentConfig = createServerFn({ method: 'GET' }).handler(
			createConsentConfigHandler({ backendURL: 'https://consent.example.com' })
		);
		expect(typeof getConsentConfig).toBe('function');
		expectTypeOf(
			createConsentConfigHandler()
		).returns.resolves.toEqualTypeOf<ConsentConfig>();
	});

	test('never carries a transport in the resolved config', async () => {
		const config = await createConsentConfigHandler({
			request: createRequest({ 'x-c15t-country': 'DE' }),
		})();
		expect(config).not.toHaveProperty('transport');
		expect(config.initialOverrides).toMatchObject({ country: 'DE' });
	});
});
