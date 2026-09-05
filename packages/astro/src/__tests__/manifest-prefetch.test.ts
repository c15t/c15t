import {
	buildConsentManifestFromConfig,
	policyPackPresets,
} from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearManifestCache } from '../api';
import { resolveOptions } from '../integration';
import { createConsentMiddleware } from '../middleware-handler';
import { manifestMode } from '../mode';
import type { C15tAstroOptions, C15tLocals } from '../types';

const MANIFEST = await buildConsentManifestFromConfig({
	branding: 'c15t',
	policyPacks: [
		policyPackPresets.europeOptIn(),
		policyPackPresets.worldNoBanner(),
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
		mode: manifestMode({ backendURL: 'https://consent.example.com' }),
	}
) {
	return resolveOptions(astroOptions);
};

interface RenderInput {
	path?: string;
	headers?: Record<string, string>;
	fetch: typeof globalThis.fetch;
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
			}),
		} as never,
		next as never
	);
	return { c15t: locals.c15t, nextCalled: next.mock.calls.length > 0 };
};

afterEach(() => {
	clearManifestCache();
});

describe('manifest-mode server prefetch', () => {
	it('fetches the manifest once across consecutive renders', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));

		const first = await render({ fetch: fetchImpl as never });
		const second = await render({ fetch: fetchImpl as never });

		// A per-render transport carried its own manifest memo, so every page
		// view paid the upstream roundtrip. The shared cache is the point of
		// manifest mode.
		expect(fetchImpl).toHaveBeenCalledOnce();
		expect(fetchImpl.mock.calls[0]?.[0]).toBe(
			'https://consent.example.com/manifest'
		);
		expect(first.c15t?.snapshot.policy?.id).toBe(
			second.c15t?.snapshot.policy?.id
		);
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

		expect(fetchImpl).toHaveBeenCalledOnce();
		expect(german.c15t?.shouldShowBanner).toBe(true);
		expect(american.c15t?.shouldShowBanner).toBe(false);
	});

	it('keeps GPC on the server-resolved overrides', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));
		const { c15t } = await render({
			fetch: fetchImpl as never,
			headers: { 'sec-gpc': '1', 'x-c15t-country': 'DE' },
		});
		expect(c15t?.config.initialOverrides?.gpc).toBe(true);
	});

	it('resolves a relative manifest URL against the request origin', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));
		await render({
			astroOptions: { mode: manifestMode({ backendURL: '/api/c15t' }) },
			fetch: fetchImpl as never,
		});
		expect(fetchImpl.mock.calls[0]?.[0]).toBe(
			'https://site.example.com/api/c15t/manifest'
		);
	});

	it('degrades to the cookie-only config when the manifest is down', async () => {
		const fetchImpl = vi.fn(() => Promise.reject(new Error('ECONNREFUSED')));
		const { c15t } = await render({ fetch: fetchImpl as never });
		expect(c15t?.snapshot.policy).toBeNull();
		expect(c15t?.config.initialTranslations?.language).toBe('en');
	});

	it('serves an inline manifest without any fetch', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));
		const { c15t } = await render({
			astroOptions: { mode: manifestMode({ manifest: MANIFEST }) },
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

	it('honours custom endpoint paths', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));
		const astroOptions: C15tAstroOptions = {
			endpoints: { initPath: '/consent/init', manifestPath: '/consent/mf' },
			mode: manifestMode({ backendURL: 'https://consent.example.com' }),
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
			middleware: { skip: ['/healthz', '/api/webhooks/'] },
			mode: manifestMode({ backendURL: 'https://consent.example.com' }),
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
