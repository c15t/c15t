import { describe, expect, it, vi } from 'vitest';

import { resolveOptions } from '../integration';
import { createConsentMiddleware } from '../middleware-handler';
import { hostedMode, offlineMode } from '../mode';
import type { C15tAstroOptions, C15tLocals } from '../types';

interface RunInput {
	headers?: Record<string, string>;
	options?: C15tAstroOptions;
	isPrerendered?: boolean;
	fetch?: typeof globalThis.fetch;
}

const run = async function run(input: RunInput = {}): Promise<C15tLocals> {
	const middleware = createConsentMiddleware(
		resolveOptions(input.options ?? { mode: offlineMode() }),
		{ fetch: input.fetch }
	);
	const locals = {} as { c15t: C15tLocals };
	const next = vi.fn(() => new Response('ok'));
	await middleware(
		{
			isPrerendered: input.isPrerendered ?? false,
			locals,
			request: new Request('https://example.com/', {
				headers: new Headers(input.headers ?? {}),
			}),
		} as never,
		next as never
	);
	expect(next).toHaveBeenCalledOnce();
	return locals.c15t;
};

describe('consent middleware', () => {
	it('populates locals for a first-time visitor', async () => {
		const c15t = await run();
		expect(c15t.shouldShowBanner).toBe(true);
		expect(c15t.snapshot.hasConsented).toBe(false);
	});

	it('reads geo through the shared header precedence', async () => {
		const c15t = await run({
			headers: {
				'cf-ipcountry': 'FR',
				'x-c15t-country': 'DE',
				'x-vercel-ip-country-region': 'BY',
			},
		});
		// `x-c15t-*` always outranks infrastructure headers.
		expect(c15t.inputs.country).toBe('DE');
		expect(c15t.inputs.region).toBe('BY');
		expect(c15t.config.initialOverrides?.country).toBe('DE');
	});

	it('reads GPC', async () => {
		expect((await run({ headers: { 'sec-gpc': '1' } })).inputs.gpc).toBe(true);
		expect((await run({ headers: { 'sec-gpc': '0' } })).inputs.gpc).toBe(false);
		expect((await run()).inputs.gpc).toBeUndefined();
	});

	it('negotiates the language from accept-language', async () => {
		const c15t = await run({
			headers: { 'accept-language': 'de-DE,de;q=0.9,en;q=0.8' },
		});
		expect(c15t.inputs.language).toBe('de');
		expect(c15t.snapshot.translations?.language).toBe('de');
	});

	it('lets an explicit locale beat accept-language', async () => {
		const c15t = await run({
			headers: { 'accept-language': 'de-DE' },
			options: { i18n: { locale: 'fr' }, mode: offlineMode() },
		});
		expect(c15t.snapshot.translations?.language).toBe('fr');
	});

	it('skips the network prefetch on a prerendered route', async () => {
		const fetchImpl = vi.fn();
		const c15t = await run({
			fetch: fetchImpl as never,
			isPrerendered: true,
			options: { mode: hostedMode({ url: 'https://consent.example.com' }) },
		});
		expect(fetchImpl).not.toHaveBeenCalled();
		// No request to resolve means no server-side decision, so the banner
		// stays out of the cached HTML and the browser decides instead.
		expect(c15t.shouldShowBanner).toBe(false);
		expect(c15t.snapshot.policy).toBeNull();
	});

	it('folds a hosted /init response into the config', async () => {
		const fetchImpl = vi.fn(() =>
			Response.json({
				branding: 'c15t',
				consents: {},
				hasConsented: false,
				location: { countryCode: 'DE', regionCode: null },
				policy: {
					id: 'gdpr',
					model: 'opt-in',
					ui: { mode: 'banner' },
				},
				translations: { language: 'en', translations: {} },
			})
		);
		const c15t = await run({
			fetch: fetchImpl as never,
			headers: { 'x-c15t-country': 'DE' },
			options: { mode: hostedMode({ url: 'https://consent.example.com' }) },
		});
		expect(fetchImpl).toHaveBeenCalledOnce();
		const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://consent.example.com/init');
		expect((init.headers as Record<string, string>)['x-c15t-country']).toBe(
			'DE'
		);
		expect(c15t.config.initialLocation?.countryCode).toBe('DE');
	});

	it('degrades silently when the backend is down', async () => {
		const fetchImpl = vi.fn(() => {
			throw new Error('ECONNREFUSED');
		});
		const c15t = await run({
			fetch: fetchImpl as never,
			options: { mode: hostedMode({ url: 'https://consent.example.com' }) },
		});
		expect(c15t.config.initialTranslations?.language).toBe('en');
	});

	it('forwards only the consent cookie to the backend', async () => {
		const fetchImpl = vi.fn(() => Response.json({}));
		await run({
			fetch: fetchImpl as never,
			headers: { cookie: 'session=abc; c15t=c.necessary:1' },
			options: { mode: hostedMode({ url: 'https://consent.example.com' }) },
		});
		const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>).cookie).toBe(
			'c15t=c.necessary:1'
		);
	});

	it('forwards the configured consent cookie name', async () => {
		const fetchImpl = vi.fn(() => Response.json({}));
		await run({
			fetch: fetchImpl as never,
			headers: { cookie: 'session=abc; my-consent=c.necessary:1' },
			options: {
				mode: hostedMode({ url: 'https://consent.example.com' }),
				storageConfig: { storageKey: 'my-consent' },
			},
		});
		const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>).cookie).toBe(
			'my-consent=c.necessary:1'
		);
	});

	it('sends no cookie when nothing consent-related is present', async () => {
		const fetchImpl = vi.fn(() => Response.json({}));
		await run({
			fetch: fetchImpl as never,
			headers: { cookie: 'session=abc' },
			options: { mode: hostedMode({ url: 'https://consent.example.com' }) },
		});
		const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>).cookie).toBeUndefined();
	});

	it('resolves a relative backend against the request, not the caller', async () => {
		// A forged `x-forwarded-host` must not steer the server-side fetch.
		const fetchImpl = vi.fn(() => Response.json({}));
		await run({
			fetch: fetchImpl as never,
			headers: { 'x-forwarded-host': 'evil.example' },
			options: { mode: hostedMode({ url: '/api/c15t' }) },
		});
		const [url] = fetchImpl.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://example.com/api/c15t/init');
	});

	it('withholds the consent cookie from a cleartext backend', async () => {
		const fetchImpl = vi.fn(() => Response.json({}));
		await run({
			fetch: fetchImpl as never,
			headers: { cookie: 'c15t=c.necessary:1' },
			options: { mode: hostedMode({ url: 'http://consent.example.com' }) },
		});
		const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>).cookie).toBeUndefined();
		expect(init.credentials).toBe('omit');
	});

	it('still sends the consent cookie to a loopback backend', async () => {
		const fetchImpl = vi.fn(() => Response.json({}));
		await run({
			fetch: fetchImpl as never,
			headers: { cookie: 'c15t=c.necessary:1' },
			options: { mode: hostedMode({ url: 'http://localhost:8787' }) },
		});
		const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>).cookie).toBe(
			'c15t=c.necessary:1'
		);
	});
});
