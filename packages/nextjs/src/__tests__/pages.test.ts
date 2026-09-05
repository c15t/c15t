/**
 * Tests for `@c15t/nextjs/pages`: the Node req/res bridge that lets
 * `getServerSideProps` and `pages/api` routes use the server helpers and
 * route handlers built for the App Router.
 */
import { clearManifestCache } from '@c15t/core/libs/manifest-cache';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { defineConsentConfig } from '../config';
import { toWebHeaders, toWebRequest } from '../node-bridge';
import type { NodeApiResponseLike } from '../node-bridge';
import {
	createPagesApiHandlers,
	prefetchInitialConsent,
	readInitialConsentConfig,
} from '../pages';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const createInitOutput = function createInitOutput(
	overrides: Record<string, unknown> = {}
) {
	return {
		branding: 'c15t',
		jurisdiction: 'GDPR',
		location: { countryCode: null, regionCode: null },
		translations: { language: 'en', translations: { common: {} } },
		...overrides,
	};
};

const createResponseSink = function createResponseSink() {
	const headers = new Map<string, string | string[]>();
	const chunks: Uint8Array[] = [];
	let ended = false;
	const res: NodeApiResponseLike = {
		end(chunk) {
			if (chunk) {
				chunks.push(chunk);
			}
			ended = true;
		},
		setHeader(name, value) {
			headers.set(name, value);
		},
		statusCode: 0,
		write(chunk) {
			chunks.push(chunk);
		},
	};
	const text = () => {
		const decoder = new TextDecoder();
		return `${chunks
			.map((chunk) => decoder.decode(chunk, { stream: true }))
			.join('')}${decoder.decode()}`;
	};
	return { ended: () => ended, headers, res, text };
};

const asyncChunks = function asyncChunks(
	chunks: (Uint8Array | string)[]
): () => AsyncIterator<Uint8Array | string> {
	return () => {
		const queue = [...chunks];
		return {
			next: () => {
				const value = queue.shift();
				return Promise.resolve(
					value === undefined
						? { done: true, value: undefined }
						: { done: false, value }
				);
			},
		};
	};
};

beforeEach(() => {
	clearManifestCache();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('@c15t/nextjs/pages: header conversion', () => {
	test('toWebHeaders joins repeated headers and skips undefined', () => {
		const headers = toWebHeaders({
			'accept-language': ['de-DE,de;q=0.9', 'en'],
			host: 'app.example.com',
			'x-missing': undefined,
		});
		expect(headers.get('host')).toBe('app.example.com');
		expect(headers.get('accept-language')).toBe('de-DE,de;q=0.9, en');
		expect(headers.has('x-missing')).toBe(false);
	});

	test('readInitialConsentConfig reads geo, language, and GPC from req.headers', async () => {
		const config = await readInitialConsentConfig({
			headers: {
				'accept-language': ['de-DE,de;q=0.9', 'en'],
				'sec-gpc': '1',
				'x-vercel-ip-country': 'DE',
				'x-vercel-ip-country-region': 'BE',
			},
		});
		expect(config.initialOverrides).toEqual({
			country: 'DE',
			gpc: true,
			language: 'de',
			region: 'BE',
		});
	});
});

describe('@c15t/nextjs/pages: cookies', () => {
	test('readInitialConsentConfig parses the consent cookie from req.headers.cookie', async () => {
		const config = await readInitialConsentConfig({
			headers: {
				cookie: 'sess=abc; c15t=c.necessary:1,c.marketing:1,i.t:1',
			},
		});
		expect(config.initialHasConsented).toBe(true);
		expect(config.initialConsents?.marketing).toBe(true);
	});

	test('cookieName follows a custom storage key', async () => {
		const config = await readInitialConsentConfig(
			{ headers: { cookie: 'consent=c.necessary:1,c.marketing:0,i.t:1' } },
			{ cookieName: 'consent' }
		);
		expect(config.initialHasConsented).toBe(true);
		expect(config.initialConsents?.marketing).toBe(false);
	});

	test('returns plain JSON', async () => {
		const config = await readInitialConsentConfig({
			headers: { cookie: 'c15t=c.necessary:1,i.t:1', 'x-country': 'FR' },
		});
		expect(JSON.parse(JSON.stringify(config))).toEqual(config);
	});
});

describe('@c15t/nextjs/pages: prefetchInitialConsent', () => {
	test('resolves the backend URL from req and forwards cookies', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify(
					createInitOutput({
						location: { countryCode: 'DE', regionCode: null },
						policy: { id: 'gdpr', model: 'opt-in', ui: { mode: 'banner' } },
					})
				),
				{ headers: { 'content-type': 'application/json' }, status: 200 }
			)
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			req: {
				headers: {
					cookie: 'sess=abc',
					host: 'app.example.com',
					'x-forwarded-proto': 'https',
					'x-vercel-ip-country': 'DE',
				},
			},
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://app.example.com/api/c15t/init');
		const headers = (init as RequestInit).headers as Record<string, string>;
		expect(headers.cookie).toBe('sess=abc');
		expect(headers['x-c15t-country']).toBe('DE');
		expect(config.initialPolicy?.id).toBe('gdpr');
		expect(config.initialLocation).toEqual({
			countryCode: 'DE',
			regionCode: null,
		});
		expect(JSON.parse(JSON.stringify(config))).toEqual(config);
	});

	test('manifestURL resolves init locally without calling /init', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestURL: '/api/consent/manifest',
			req: {
				headers: {
					host: 'app.example.com',
					'x-forwarded-proto': 'https',
					'x-vercel-ip-country': 'DE',
				},
			},
		});

		const [url] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://app.example.com/api/consent/manifest');
		expect(config.initialPolicy?.id).toBe('eu-opt-in');
	});
});

describe('@c15t/nextjs/pages: API bridge', () => {
	test('toWebRequest rebuilds the URL and reads a streamed body', async () => {
		const request = await toWebRequest({
			[Symbol.asyncIterator]: asyncChunks([
				new TextEncoder().encode('{"a":'),
				'1}',
			]),
			headers: {
				'content-type': 'application/json',
				host: 'app.example.com',
				'x-forwarded-proto': 'https',
			},
			method: 'POST',
			url: '/api/consent/manifest?language=de',
		});
		expect(request.method).toBe('POST');
		expect(request.url).toBe(
			'https://app.example.com/api/consent/manifest?language=de'
		);
		expect(request.headers.get('content-type')).toBe('application/json');
		expect(await request.json()).toEqual({ a: 1 });
	});

	test('toWebRequest prefers a body Next already parsed', async () => {
		const request = await toWebRequest({
			body: { a: 1 },
			headers: { host: 'app.example.com' },
			method: 'POST',
			url: '/api/c15t/init',
		});
		expect(request.url).toBe('http://app.example.com/api/c15t/init');
		expect(await request.json()).toEqual({ a: 1 });
	});

	test('manifest copies status, headers, and body onto res', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: {
					'cache-control': 'public, s-maxage=90, stale-while-revalidate=45',
					etag: '"manifest-revision"',
				},
				status: 200,
			})
		);
		const { manifest } = createPagesApiHandlers({
			backendURL: 'https://consent.example.com/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		const sink = createResponseSink();

		await manifest(
			{
				headers: { host: 'app.example.com' },
				method: 'GET',
				url: '/api/consent/manifest?language=de',
			},
			sink.res
		);

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://consent.example.com/api/c15t/manifest?language=de',
			expect.anything()
		);
		expect(sink.ended()).toBe(true);
		expect(sink.res.statusCode).toBe(200);
		expect(sink.headers.get('content-type')).toBe('application/json');
		expect(sink.headers.get('cache-control')).toBe(
			'public, s-maxage=90, stale-while-revalidate=45'
		);
		expect(sink.headers.get('etag')).toBe('"manifest-revision"');
		expect(JSON.parse(sink.text())).toEqual(MANIFEST_FIXTURE);
	});

	test('init resolves from req headers and writes the payload', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(MANIFEST_FIXTURE), { status: 200 })
			);
		const { init } = createPagesApiHandlers({
			backendURL: 'https://consent.example.com/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		const sink = createResponseSink();

		await init(
			{
				headers: {
					'accept-language': 'de-DE,de;q=0.9',
					host: 'app.example.com',
					'x-vercel-ip-country': 'DE',
					'x-vercel-ip-country-region': 'BE',
				},
				method: 'GET',
				url: '/api/c15t/init',
			},
			sink.res
		);

		expect(sink.res.statusCode).toBe(200);
		expect(sink.headers.get('cache-control')).toBe('private, no-store');
		const body = JSON.parse(sink.text());
		expect(body.location).toEqual({ countryCode: 'DE', regionCode: 'BE' });
		expect(body.translations.language).toBe('de');
	});

	test('handlers and prefetch accept a defineConsentConfig result', async () => {
		const fetchSpy = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(
					new Response(JSON.stringify(MANIFEST_FIXTURE), { status: 200 })
				)
			);
		const consentConfig = defineConsentConfig({
			backendURL: 'https://consent.example.com/api/c15t',
			initURL: '/api/consent/init',
			manifestURL: '/api/consent/manifest',
		});
		const { manifest } = createPagesApiHandlers({
			...consentConfig,
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		const sink = createResponseSink();

		await manifest(
			{
				headers: { host: 'app.example.com' },
				method: 'GET',
				url: '/api/consent/manifest',
			},
			sink.res
		);
		const config = await prefetchInitialConsent({
			config: consentConfig,
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			req: {
				headers: {
					host: 'app.example.com',
					'x-forwarded-proto': 'https',
					'x-vercel-ip-country': 'DE',
				},
			},
		});

		expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
			'https://consent.example.com/api/c15t/manifest',
			'https://app.example.com/api/consent/manifest',
		]);
		expect(sink.res.statusCode).toBe(200);
		expect(config.initialPolicy?.id).toBe('eu-opt-in');
	});
});
