import {
	buildConsentManifestFromConfig,
	policyPackPresets,
} from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	clearManifestCache,
	createConsentRouteHandlers,
	fetchCachedManifest,
	resolveManifestSourceURL,
} from '../api';
import { resolveOptions } from '../integration';
import { hostedMode, manifestMode } from '../mode';
import type { C15tAstroOptions } from '../types';

// Built through the shared builder so the fixture is exactly what a real
// backend serves — a hand-written stand-in silently resolves to `none`.
const MANIFEST = await buildConsentManifestFromConfig({
	branding: 'c15t',
	policyPacks: [
		policyPackPresets.europeOptIn(),
		policyPackPresets.worldNoBanner(),
	],
});

const makeRequest = function makeRequest(
	url = 'https://site.example.com/api/c15t/init',
	headers: Record<string, string> = {}
): Request {
	return new Request(url, { headers: new Headers(headers) });
};

const jsonResponse = function jsonResponse(
	body: unknown,
	headers: Record<string, string> = {}
): Response {
	return new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json', ...headers },
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

afterEach(() => {
	clearManifestCache();
});

describe('resolveManifestSourceURL', () => {
	it('derives the manifest URL from the backend URL', () => {
		expect(resolveManifestSourceURL(makeRequest(), options())).toBe(
			'https://consent.example.com/manifest'
		);
	});

	it('prefers an explicit manifest URL', () => {
		expect(
			resolveManifestSourceURL(
				makeRequest(),
				options({
					mode: manifestMode({
						backendURL: 'https://consent.example.com',
						manifestURL: 'https://cdn.example.com/manifest.json',
					}),
				})
			)
		).toBe('https://cdn.example.com/manifest.json');
	});

	it('resolves a same-origin backend against the request', () => {
		expect(
			resolveManifestSourceURL(
				makeRequest('https://site.example.com/api/c15t/init', {
					host: 'site.example.com',
					'x-forwarded-proto': 'https',
				}),
				options({ mode: hostedMode({ url: '/api/consent' }) })
			)
		).toBe('https://site.example.com/api/consent/manifest');
	});

	it('says what is missing when nothing is configured', () => {
		expect(() =>
			resolveManifestSourceURL(makeRequest(), options({ mode: manifestMode() }))
		).toThrowError(/backendURL. or .manifestURL/u);
	});
});

describe('manifest cache', () => {
	it('serves a second request from memory', async () => {
		const fetchImpl = vi.fn(() =>
			jsonResponse(MANIFEST, { 'cache-control': 'public, s-maxage=300' })
		);
		const first = await fetchCachedManifest({
			fetch: fetchImpl,
			sourceURL: 'https://consent.example.com/manifest',
		});
		const second = await fetchCachedManifest({
			fetch: fetchImpl,
			sourceURL: 'https://consent.example.com/manifest',
		});
		expect(fetchImpl).toHaveBeenCalledOnce();
		expect(second.manifest).toEqual(first.manifest);
		expect(first.sMaxAge).toBe(300);
	});

	it('revalidates with the stored ETag and reuses the body on 304', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(MANIFEST, {
					'cache-control': 'public, s-maxage=1',
					etag: 'W/"v1"',
				})
			)
			.mockResolvedValueOnce(
				new Response(null, {
					headers: { 'cache-control': 'public, s-maxage=1' },
					status: 304,
				})
			);

		await fetchCachedManifest({
			fetch: fetchImpl,
			now: 0,
			sourceURL: 'https://consent.example.com/manifest',
		});
		const refreshed = await fetchCachedManifest({
			fetch: fetchImpl,
			now: 10_000,
			sourceURL: 'https://consent.example.com/manifest',
		});

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		const [, init] = fetchImpl.mock.calls[1] as [string, RequestInit];
		expect((init.headers as Record<string, string>)['if-none-match']).toBe(
			'W/"v1"'
		);
		expect(refreshed.manifest).toEqual(MANIFEST);
	});

	it('does not cache a no-store manifest', async () => {
		const fetchImpl = vi.fn(() =>
			jsonResponse(MANIFEST, { 'cache-control': 'no-store' })
		);
		await fetchCachedManifest({
			fetch: fetchImpl,
			now: 0,
			sourceURL: 'https://consent.example.com/manifest',
		});
		await fetchCachedManifest({
			fetch: fetchImpl,
			now: 1,
			sourceURL: 'https://consent.example.com/manifest',
		});
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it('reports a failing backend', async () => {
		const fetchImpl = vi.fn(
			() => new Response('nope', { status: 502, statusText: 'Bad Gateway' })
		);
		await expect(
			fetchCachedManifest({
				fetch: fetchImpl,
				sourceURL: 'https://consent.example.com/manifest',
			})
		).rejects.toThrowError(/502 Bad Gateway/u);
	});
});

describe('route handlers', () => {
	it('resolves init from the manifest and forbids caching it', async () => {
		const fetchImpl = vi.fn(() =>
			jsonResponse(MANIFEST, { 'cache-control': 'public, s-maxage=300' })
		);
		const handlers = createConsentRouteHandlers({
			fetch: fetchImpl,
			options: options(),
		});
		const german = (await (
			await handlers.init(
				makeRequest('https://site.example.com/api/c15t/init', {
					'accept-language': 'de',
					'x-c15t-country': 'DE',
				})
			)
		).json()) as {
			translations: { language: string };
			policy: { model: string };
		};

		expect(german.translations.language).toBe('de');
		expect(german.policy.model).toBe('opt-in');

		// The same manifest, a different country, a different decision.
		const american = (await (
			await handlers.init(
				makeRequest('https://site.example.com/api/c15t/init', {
					'x-c15t-country': 'US',
				})
			)
		).json()) as { policy: { ui: { mode: string } } };
		expect(american.policy.ui.mode).toBe('none');

		const response = await handlers.init(makeRequest());
		expect(response.headers.get('cache-control')).toBe('private, no-store');
	});

	it('passes the backend cache headers through on /manifest', async () => {
		const fetchImpl = vi.fn(() =>
			jsonResponse(MANIFEST, {
				'cache-control': 'public, s-maxage=600, stale-while-revalidate=86400',
				etag: 'W/"abc"',
			})
		);
		const handlers = createConsentRouteHandlers({
			fetch: fetchImpl,
			options: options(),
		});
		const response = await handlers.manifest(
			makeRequest('https://site.example.com/api/c15t/manifest?language=fr')
		);

		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=600, stale-while-revalidate=86400'
		);
		expect(response.headers.get('etag')).toBe('W/"abc"');
		expect(await response.json()).toEqual(MANIFEST);

		const [url] = fetchImpl.mock.calls[0] as [string];
		expect(url).toContain('language=fr');
	});
});
