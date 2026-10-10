import { clearGvlCache } from '@c15t/core/server';
import {
	buildConsentManifestFromConfig,
	policyRulePresets,
} from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { resolveOptions } from '../integration';
import { createConsentMiddleware } from '../middleware-handler';
import { manifest as manifestMode } from '../mode';
import { clearManifestCache } from '../server';
import type { C15tAstroOptions, C15tLocals } from '../types';

const MANIFEST = await buildConsentManifestFromConfig({
	branding: 'c15t',
	policyRules: [
		policyRulePresets.europeOptIn(),
		policyRulePresets.worldOptOutNoPrompt(),
	],
});

const manifestResponse = function manifestResponse(): Response {
	return new Response(JSON.stringify(MANIFEST), {
		headers: {
			'cache-control': 'public, s-maxage=300',
			'content-type': 'application/json',
			etag: '"manifest-1"',
		},
		status: 200,
	});
};

const options = function options(
	astroOptions: C15tAstroOptions = {
		backendURL: 'https://consent.example.com',
		mode: manifestMode(),
	}
) {
	return resolveOptions(astroOptions);
};

interface RenderInput {
	path?: string;
	method?: string;
	headers?: Record<string, string>;
	fetch?: typeof globalThis.fetch;
	astroOptions?: C15tAstroOptions;
}

const render = async function render(
	input: RenderInput
): Promise<{ c15t?: C15tLocals; nextCalled: boolean }> {
	const middleware = createConsentMiddleware(options(input.astroOptions), {
		fetch: input.fetch,
	});
	const locals = {} as { c15t?: C15tLocals };
	const next = vi.fn(() => new Response('ok'));
	await middleware(
		{
			isPrerendered: false,
			locals,
			request: new Request(`https://site.example.com${input.path ?? '/'}`, {
				headers: new Headers(input.headers ?? {}),
				method: input.method ?? 'GET',
			}),
		} as never,
		next as never
	);
	return { c15t: locals.c15t, nextCalled: next.mock.calls.length > 0 };
};

afterEach(() => {
	clearManifestCache();
	clearGvlCache();
});

describe('manifest-mode server prefetch', () => {
	it('reports each render to the backend, detached from the response', async () => {
		const fetchImpl = vi.fn((input: string) =>
			Promise.resolve(
				input.endsWith('/sessions')
					? new Response(null, { status: 204 })
					: manifestResponse()
			)
		);

		await render({
			fetch: fetchImpl as never,
			headers: {
				accept: 'text/html',
				'user-agent': 'Mozilla/5.0',
				'x-c15t-country': 'DE',
				'x-forwarded-for': '203.0.113.42',
			},
		});
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});

		const report = fetchImpl.mock.calls.find(
			([url]) => url === 'https://consent.example.com/sessions'
		);
		expect(report).toBeDefined();
		const init = report?.[1] as RequestInit;
		expect((init.headers as Record<string, string>)['x-c15t-client-ip']).toBe(
			'203.0.113.42'
		);
		expect(JSON.parse(init.body as string)).toMatchObject({
			adapter: '@c15t/astro',
			country: 'DE',
			policy: { id: expect.any(String) },
			source: 'render',
		});
	});

	it('still resolves per-request geo off the cached manifest', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));

		const german = await render({
			fetch: fetchImpl as never,
			headers: { 'x-c15t-country': 'DE' },
		});
		const american = await render({
			fetch: fetchImpl as never,
			headers: { 'x-c15t-country': 'US' },
		});

		expect(
			fetchImpl.mock.calls.filter(([url]) => String(url).endsWith('/manifest'))
		).toHaveLength(1);
		expect(german.c15t?.shouldShowBanner).toBe(true);
		expect(american.c15t?.shouldShowBanner).toBe(false);
	});

	it('serves an inline manifest without any fetch', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));
		const { c15t } = await render({
			astroOptions: {
				backendURL: 'https://consent.example.com',
				mode: manifestMode({ snapshot: MANIFEST }),
				reportSessions: false,
			},
			fetch: fetchImpl as never,
			headers: { 'x-c15t-country': 'DE' },
		});
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(c15t?.shouldShowBanner).toBe(true);
	});
});

describe('middleware skip list', () => {
	it('leaves the injected init and manifest routes alone', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));

		const results = await Promise.all(
			['/api/c15t/init', '/api/c15t/manifest'].map((path) =>
				render({ fetch: fetchImpl as never, path })
			)
		);
		// Resolving consent here would fetch the manifest from this same
		// process, which would resolve consent again: the request never
		// returns.
		for (const result of results) {
			expect(result.c15t).toBeUndefined();
			expect(result.nextCalled).toBe(true);
		}
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('honours a custom routePrefix', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));
		const astroOptions: C15tAstroOptions = {
			backendURL: 'https://consent.example.com',
			mode: manifestMode(),
			routePrefix: '/consent',
		};
		expect(
			(
				await render({
					astroOptions,
					fetch: fetchImpl as never,
					path: '/consent/init',
				})
			).c15t
		).toBeUndefined();
		expect(
			(
				await render({
					astroOptions,
					fetch: fetchImpl as never,
					path: '/api/c15t/init',
				})
			).c15t
		).toBeDefined();
	});

	it('skips the paths the site listed', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));
		const astroOptions: C15tAstroOptions = {
			backendURL: 'https://consent.example.com',
			middleware: { skip: ['/healthz', '/api/webhooks/'] },
			mode: manifestMode(),
		};
		const skipped = await Promise.all(
			['/healthz', '/api/webhooks', '/api/webhooks/stripe'].map((path) =>
				render({ astroOptions, fetch: fetchImpl as never, path })
			)
		);
		for (const result of skipped) {
			expect(result.c15t).toBeUndefined();
		}
		// A prefix must not claim a sibling that merely starts with it.
		expect(
			(
				await render({
					astroOptions,
					fetch: fetchImpl as never,
					path: '/healthz-report',
				})
			).c15t
		).toBeDefined();
	});
});

it.each(['public', 'custom'] as const)(
	'preserves %s Astro SSR vendor loading through the caching loader',
	async (loader) => {
		const manifest = await buildConsentManifestFromConfig({
			branding: 'c15t',
			iab: {
				cmpId: 28,
				enabled: true,
				gvl: { url: `https://vendors.example/${loader}.json` },
			},
			policyRules: [policyRulePresets.europeIab()],
		});
		const fetch = vi.fn(() => Promise.resolve(Response.json(completeGVL)));
		vi.stubGlobal('fetch', fetch);
		try {
			const result = await render({
				// IAB is opt-in: without `iab` an IAB policy throws.
				astroOptions: {
					backendURL: 'https://consent.example.com',
					iab: { cmpId: 28 },
					mode: manifestMode({ snapshot: manifest }),
					reportSessions: false,
				},
				fetch: loader === 'custom' ? fetch : undefined,
				headers: { 'x-c15t-country': 'DE' },
			});
			expect(fetch).toHaveBeenCalledOnce();
			expect(result.c15t?.config.initialIab?.gvl).toEqual(
				loader === 'public' ? null : completeGVL
			);
			expect(Boolean(result.c15t?.config.initialIab?.gvlReference)).toBe(
				loader === 'public'
			);
		} finally {
			vi.unstubAllGlobals();
		}
	}
);
