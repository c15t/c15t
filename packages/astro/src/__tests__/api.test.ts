/**
 * Wiring of the injected route onto the core consent route handler. The
 * route behaviour itself is pinned once, in
 * `packages/core/src/server/__tests__/consent-route.test.ts`.
 */
import {
	buildConsentManifestFromConfig,
	policyRulePresets,
} from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { resolveOptions } from '../integration';
import { hosted as hostedMode, manifest as manifestMode } from '../mode';
import {
	clearManifestCache,
	createConsentRouteHandlers,
	resolveConsentContext,
	resolveManifestSourceURL,
	waitUntilFromLocals,
} from '../server';
import type { C15tAstroOptions } from '../types';

const MANIFEST = await buildConsentManifestFromConfig({
	branding: 'c15t',
	policyRules: [
		policyRulePresets.europeOptIn(),
		policyRulePresets.worldOptOutNoPrompt(),
	],
});

const BACKEND = 'https://consent.example.com';

const request = (path: string, headers: Record<string, string> = {}) =>
	new Request(`https://site.example.com${path}`, { headers });

const options = (
	astroOptions: C15tAstroOptions = {
		backendURL: BACKEND,
		mode: manifestMode(),
	}
) => resolveOptions(astroOptions);

const upstream = () =>
	vi.fn<typeof globalThis.fetch>(() =>
		Promise.resolve(
			Response.json(MANIFEST, { headers: { 'cache-control': 's-maxage=60' } })
		)
	);

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	clearManifestCache();
});

describe('createConsentRouteHandlers', () => {
	it('reads the manifest from the mode: manifestURL, backendURL or the hosted URL', async () => {
		for (const [mode, expected] of [
			[manifestMode(), `${BACKEND}/manifest`],
			[
				manifestMode({ manifestURL: 'https://cdn.example.com/m.json' }),
				'https://cdn.example.com/m.json',
			],
			[
				hostedMode({ backendURL: '/api/self-host' }),
				'https://site.example.com/api/self-host/manifest',
			],
		] as const) {
			clearManifestCache();
			const fetch = upstream();
			// oxlint-disable-next-line no-await-in-loop -- one mode at a time keeps the failing case readable.
			await createConsentRouteHandlers({
				fetch,
				options: options({ backendURL: BACKEND, mode }),
			}).manifest(request('/api/c15t/manifest'));
			expect(fetch.mock.calls[0]?.[0]).toBe(expected);
		}
		expect(resolveManifestSourceURL(request('/api/c15t/init'), options())).toBe(
			`${BACKEND}/manifest`
		);
	});

	it('resolves an inline manifest without fetching it', async () => {
		const fetch = upstream();
		const handlers = createConsentRouteHandlers({
			fetch,
			options: options({
				backendURL: BACKEND,
				mode: manifestMode({ snapshot: MANIFEST }),
			}),
		});
		const response = await handlers.init(
			request('/api/c15t/init', { 'x-c15t-country': 'DE' })
		);
		expect(response.status).toBe(200);
		expect(
			fetch.mock.calls.filter(([url]) => !String(url).endsWith('/sessions'))
		).toEqual([]);
	});

	it('applies the configured locale to init, not just Accept-Language', async () => {
		const handlers = createConsentRouteHandlers({
			fetch: upstream(),
			options: options({
				backendURL: BACKEND,
				i18n: { locale: 'de' },
				mode: manifestMode(),
				reportSessions: false,
			}),
		});
		const payload = await (
			await handlers.init(
				request('/api/c15t/init', {
					'accept-language': 'fr',
					'x-c15t-country': 'DE',
				})
			)
		).json();
		expect(payload.translations.language).toBe('de');
	});

	it.each([
		[
			'reportSessions: false',
			{ backendURL: BACKEND, mode: manifestMode(), reportSessions: false },
		],
		['hosted mode', { mode: hostedMode({ backendURL: BACKEND }) }],
	] satisfies [string, C15tAstroOptions][])(
		'sends no session report for %s',
		async (_, astroOptions) => {
			const fetch = upstream();
			await createConsentRouteHandlers({
				fetch,
				options: options(astroOptions),
			}).init(request('/api/c15t/init'));
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(
				fetch.mock.calls.some(([url]) => String(url).endsWith('/sessions'))
			).toBe(false);
		}
	);

	it('GET dispatches the catch-all route by its last segment', async () => {
		const handlers = createConsentRouteHandlers({
			fetch: upstream(),
			options: options(),
		});
		const manifest = await handlers.GET(request('/api/c15t/manifest'));
		const init = await handlers.GET(request('/api/c15t/init'));
		const other = await handlers.GET(request('/api/c15t/subjects'));
		expect(manifest.headers.get('cache-control')).toBe('s-maxage=60');
		expect(init.headers.get('cache-control')).toBe('private, no-store');
		expect(other.status).toBe(404);
	});

	it('registers detached work with the waitUntil on locals', async () => {
		const waitUntil = vi.fn();
		await createConsentRouteHandlers({
			fetch: upstream(),
			options: options(),
		}).init(request('/api/c15t/init'), {
			locals: { cfContext: { waitUntil } },
		});
		expect(waitUntil).toHaveBeenCalledTimes(1);
	});
});

describe('waitUntilFromLocals', () => {
	it('prefers locals.cfContext and never reads the Astro 6 runtime getter then', () => {
		const cfContext = { waitUntil: vi.fn() };
		const locals = {
			cfContext,
			get runtime(): never {
				throw new Error('Astro 6 removed locals.runtime');
			},
		};
		const task = Promise.resolve();
		waitUntilFromLocals(task, locals);
		expect(cfContext.waitUntil).toHaveBeenCalledWith(task);
	});

	it('falls back to locals.runtime.ctx before Astro 6', () => {
		const ctx = { waitUntil: vi.fn() };
		const task = Promise.resolve();
		waitUntilFromLocals(task, { runtime: { ctx } });
		expect(ctx.waitUntil).toHaveBeenCalledWith(task);
		expect(() => waitUntilFromLocals(task, undefined)).not.toThrow();
	});
});

it('serves Astro manifest SSR references through the same-origin init route', async () => {
	const manifest = await buildConsentManifestFromConfig({
		branding: 'c15t',
		iab: {
			cmpId: 28,
			enabled: true,
			gvl: { url: 'https://server-only.example/list.json' },
		},
		policyRules: [policyRulePresets.europeIab()],
	});
	if (!manifest.iab) {
		throw new Error('Expected IAB manifest');
	}
	manifest.iab.gvl = { url: 'https://server-only.example/list.json' };
	const gvlUpstream = vi.fn(() => Promise.resolve(Response.json(completeGVL)));
	vi.stubGlobal('fetch', gvlUpstream);
	const resolved = options({
		backendURL: BACKEND,
		// IAB is opt-in: without `iab` an IAB policy throws.
		iab: { cmpId: 28 },
		mode: manifestMode({ snapshot: manifest }),
		reportSessions: false,
		routePrefix: '/privacy',
	});
	const context = await resolveConsentContext({
		headers: new Headers({ 'x-c15t-country': 'DE' }),
		options: resolved,
		url: 'https://site.example.com/page',
	});
	const reference = context.config.initialIab?.gvlReference;
	expect(context.config.initialIab?.gvl).toBeNull();
	expect(reference?.url).toBe(
		`/privacy/init?c15t-gvl=${completeGVL.vendorListVersion}&language=en`
	);
	const handlers = createConsentRouteHandlers({ options: resolved });
	const init = await handlers.init(
		request('/privacy/init', { 'x-c15t-country': 'DE' })
	);
	expect((await init.json()).gvlReference.url).toBe(reference?.url);
	const list = await handlers.init(request(reference?.url ?? ''));
	expect(list.status).toBe(200);
	expect(await list.json()).toEqual(completeGVL);
	// The render, the init route and the list request share one download.
	expect(gvlUpstream).toHaveBeenCalledTimes(1);
});
