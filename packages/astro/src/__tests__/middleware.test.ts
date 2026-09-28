import {
	buildConsentManifestFromConfig,
	policyRulePresets,
} from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { clearManifestCache } from '../api';
import { resolveOptions } from '../integration';
import { createConsentMiddleware } from '../middleware-handler';
import { hostedMode, manifestMode, offlineMode } from '../mode';
import type { C15tAstroOptions, C15tLocals } from '../types';
import { testRule, testWire } from './policy-fixture';

interface RunInput {
	headers?: Record<string, string>;
	options?: C15tAstroOptions;
	isPrerendered?: boolean;
	fetch?: typeof globalThis.fetch;
	/** Extra `Astro.locals` fields, such as an adapter runtime. */
	locals?: Record<string, unknown>;
}

const run = async function run(input: RunInput = {}): Promise<C15tLocals> {
	const middleware = createConsentMiddleware(
		resolveOptions(
			input.options ?? { mode: offlineMode({ policyRules: [testRule] }) }
		),
		{ fetch: input.fetch }
	);
	const locals = { ...(input.locals ?? {}) } as { c15t: C15tLocals };
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
	afterEach(() => {
		clearManifestCache();
		vi.useRealTimers();
	});

	it("hands a stale manifest's background refresh to locals.runtime.ctx.waitUntil", async () => {
		vi.useFakeTimers();
		const manifest = await buildConsentManifestFromConfig({
			branding: 'c15t',
			policyRules: [policyRulePresets.europeOptIn()],
		});
		const fetchImpl = vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify(manifest), {
					headers: {
						'cache-control': 'public, s-maxage=1, stale-while-revalidate=600',
						'content-type': 'application/json',
						etag: 'W/"v1"',
					},
					status: 200,
				})
			)
		) as unknown as typeof globalThis.fetch;
		const registered: Promise<unknown>[] = [];
		const locals = {
			runtime: {
				ctx: {
					waitUntil: (promise: Promise<unknown>) => {
						registered.push(promise);
					},
				},
			},
		};
		const options: C15tAstroOptions = {
			// Session reports go through the same `waitUntil`; off here so the
			// registrations counted below are the refresh alone.
			mode: manifestMode({
				backendURL: 'https://consent.example.com',
				reportSessions: false,
			}),
		};

		await run({ fetch: fetchImpl, locals, options });
		expect(registered).toHaveLength(0);

		vi.setSystemTime(Date.now() + 1500);
		await run({ fetch: fetchImpl, locals, options });
		expect(registered).toHaveLength(1);
		await expect(registered[0]).resolves.toBeUndefined();
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it('populates locals for a first-time visitor', async () => {
		const c15t = await run();
		expect(c15t.shouldShowBanner).toBe(true);
		expect(c15t.snapshot.explicitChoice).toBeNull();
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
			options: {
				i18n: { locale: 'fr' },
				mode: offlineMode({ policyRules: [testRule] }),
			},
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
		expect(c15t.snapshot.resolution.status).toBe('unconfigured');
	});

	it('folds a hosted /init response into the config', async () => {
		const fetchImpl = vi.fn(() =>
			Response.json({
				branding: 'c15t',
				consents: {},
				hasConsented: false,
				location: { countryCode: 'DE', regionCode: null },
				policyResolution: testWire({ id: 'gdpr' }),
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

	it.each(['999', 'invalid'])(
		'denies an unsupported producer contract %s',
		async (contract) => {
			const c15t = await run({
				fetch: vi.fn(() =>
					Response.json(
						{
							location: { countryCode: null, regionCode: null },
							policyResolution: testWire({ model: 'opt-out', prompt: 'none' }),
							translations: { language: 'en', translations: {} },
						},
						{ headers: { 'x-c15t-policy-contract': contract } }
					)
				) as never,
				options: { mode: hostedMode({ url: 'https://consent.example.com' }) },
			});
			expect(c15t.snapshot.resolution).toMatchObject({
				reason: 'unsupported-contract',
				status: 'failed',
			});
			expect(c15t.snapshot.effectivePermissions.marketing).toBe(false);
		}
	);

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

	it('applies the configured init headers to the server prefetch', async () => {
		// Otherwise the server resolves one policy and the browser another.
		const fetchImpl = vi.fn(() => Response.json({}));
		await run({
			fetch: fetchImpl as never,
			headers: { 'cf-ipcountry': 'FR' },
			options: {
				mode: hostedMode({
					headers: { 'x-c15t-country': 'DE', 'x-tenant': 'nope' },
					url: 'https://consent.example.com',
				}),
			},
		});
		const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
		const sent = init.headers as Record<string, string>;
		expect(sent['x-c15t-country']).toBe('DE');
		expect(sent['x-tenant']).toBeUndefined();
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

it.each(['c15t=consent', 'session=unrelated'])(
	'preserves hosted Astro vendor loading when the request cookie is %s',
	async (cookie) => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				Response.json({
					branding: 'c15t',
					gvl: completeGVL,
					location: { countryCode: 'DE', regionCode: null },
					policyResolution: testWire({ model: 'iab' }),
					translations: { language: 'en', translations: {} },
				})
			)
		);
		vi.stubGlobal('fetch', fetch);
		try {
			const result = await run({
				headers: { cookie },
				options: { mode: hostedMode({ url: 'https://example.com/api/c15t' }) },
			});
			expect(fetch).toHaveBeenCalledOnce();
			expect(result.config.initialIab?.gvl).toEqual(
				cookie.startsWith('c15t=') ? completeGVL : null
			);
			expect(Boolean(result.config.initialIab?.gvlReference)).toBe(
				!cookie.startsWith('c15t=')
			);
		} finally {
			vi.unstubAllGlobals();
		}
	}
);
