/**
 * In-process manifest cache shared by the framework server adapters.
 *
 * Covers the caching contract adapters rely on: TTL from `s-maxage`, ETag
 * revalidation, `no-store` opt-out, the dedupe floor, and the shape of a
 * locally resolved init.
 */
import type { ConsentManifest } from '@c15t/schema/types';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	clearManifestCache,
	createManifestCache,
	createManifestRequestURL,
	fetchCachedManifest,
	getManifestAge,
	getManifestSMaxAge,
	getManifestStaleWhileRevalidate,
	getResolverInputsFromHeaders,
	MANIFEST_DEDUPE_TTL_SECONDS,
	MANIFEST_PASSTHROUGH_HEADERS,
	resolveManifestInit,
	resolveManifestSourceURL,
} from '../transports/manifest-cache';
import type {
	CachedManifestResponse,
	ManifestCache,
	ManifestFetch,
} from '../transports/manifest-cache';
import { C15T_VERSION_HEADER } from '../transports/version-header';

const SOURCE_URL = 'https://backend.example/manifest';

const createManifestFixture = function createManifestFixture(
	revision = 'manifest-rev-1'
): ConsentManifest {
	return {
		branding: 'c15t',
		policyPacks: [
			createConsentManifestPolicyPack({
				categories: ['measurement', 'marketing'],
				id: 'eu-opt-in',
				match: { countries: ['DE'], fallback: true },
				model: 'opt-in',
				prompt: 'choice',
				scopeMode: 'strict',
			}),
			createConsentManifestPolicyPack({
				categories: ['marketing'],
				id: 'ca-opt-out',
				match: { regions: [{ country: 'US', region: 'CA' }] },
				model: 'opt-out',
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
				prompt: 'choice',
				scopeMode: 'permissive',
			}),
		],
		revision,
		schemaVersion: 2,
		translations: {
			i18n: {
				defaultProfile: 'default',
				messages: {
					default: {
						fallbackLanguage: 'en',
						translations: {
							de: {
								common: {
									acceptAll: 'Alle akzeptieren',
									rejectAll: 'Alle ablehnen',
								},
							},
							en: {
								common: {
									acceptAll: 'Accept all',
									rejectAll: 'Reject all',
								},
							},
						},
					},
				},
			},
		},
	};
};

const manifestResponse = function manifestResponse(
	headers: Record<string, string>,
	manifest = createManifestFixture()
): Response {
	return new Response(JSON.stringify(manifest), {
		headers: { 'content-type': 'application/json', ...headers },
		status: 200,
	});
};

const createFetchMock = function createFetchMock(
	respond: (input: string | URL | Request, init?: RequestInit) => Response
) {
	return vi.fn<ManifestFetch>((input, init) =>
		Promise.resolve(respond(input, init))
	);
};

afterEach(() => {
	clearManifestCache();
});

describe('fetchCachedManifest', () => {
	test('serves a cached manifest inside the s-maxage TTL', async () => {
		const fetchMock = createFetchMock(() =>
			manifestResponse({
				'cache-control': 'public, s-maxage=60, stale-while-revalidate=120',
				etag: '"manifest-rev-1"',
			})
		);

		const first = await fetchCachedManifest({
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		const second = await fetchCachedManifest({
			fetch: fetchMock,
			now: 59_000,
			sourceURL: SOURCE_URL,
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0]?.[0]).toBe(SOURCE_URL);
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			headers: {
				accept: 'application/json',
				[C15T_VERSION_HEADER]: expect.any(String),
			},
			method: 'GET',
		});
		expect(first).toMatchObject({
			expiresAt: 61_000,
			headers: expect.objectContaining({ etag: '"manifest-rev-1"' }),
			manifest: expect.objectContaining({ revision: 'manifest-rev-1' }),
			sMaxAge: 60,
		});
		expect(second).toBe(first);
		expect(getManifestSMaxAge(first.headers['cache-control'])).toBe(60);
		expect(
			getManifestStaleWhileRevalidate(first.headers['cache-control'])
		).toBe(120);
	});

	test('revalidates an expired entry with If-None-Match and refreshes it on 304', async () => {
		let requests = 0;
		const fetchMock = createFetchMock(() => {
			requests += 1;
			if (requests === 1) {
				return manifestResponse({
					'cache-control': 'public, s-maxage=60',
					etag: '"manifest-rev-1"',
				});
			}
			return new Response(null, {
				headers: { 'cache-control': 'public, s-maxage=30' },
				status: 304,
			});
		});

		const first = await fetchCachedManifest({
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		const refreshed = await fetchCachedManifest({
			fetch: fetchMock,
			now: 62_000,
			sourceURL: SOURCE_URL,
		});
		const served = await fetchCachedManifest({
			fetch: fetchMock,
			now: 90_000,
			sourceURL: SOURCE_URL,
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
			headers: { 'if-none-match': '"manifest-rev-1"' },
		});
		expect(refreshed.manifest).toBe(first.manifest);
		expect(refreshed).toMatchObject({
			expiresAt: 92_000,
			headers: {
				'cache-control': 'public, s-maxage=30',
				etag: '"manifest-rev-1"',
			},
			sMaxAge: 30,
		});
		expect(served).toBe(refreshed);
	});

	test('a 304 without Age resets the upstream age of the refreshed entry', async () => {
		let requests = 0;
		const fetchMock = createFetchMock(() => {
			requests += 1;
			if (requests === 1) {
				return manifestResponse({
					age: '119',
					'cache-control': 'public, s-maxage=120',
					etag: '"manifest-rev-1"',
				});
			}
			return new Response(null, {
				headers: { 'cache-control': 'public, s-maxage=120' },
				status: 304,
			});
		});

		const first = await fetchCachedManifest({
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		expect(first).toMatchObject({ expiresAt: 2000, upstreamAge: 119 });

		const refreshed = await fetchCachedManifest({
			fetch: fetchMock,
			now: 3000,
			sourceURL: SOURCE_URL,
		});
		expect(refreshed).toMatchObject({ expiresAt: 123_000, upstreamAge: 0 });
		expect(refreshed.headers.age).toBeUndefined();

		await fetchCachedManifest({
			fetch: fetchMock,
			now: 60_000,
			sourceURL: SOURCE_URL,
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('never caches a no-store response', async () => {
		const fetchMock = createFetchMock(() =>
			manifestResponse({ 'cache-control': 'no-store' })
		);

		const first = await fetchCachedManifest({
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		await fetchCachedManifest({
			fetch: fetchMock,
			now: 1001,
			sourceURL: SOURCE_URL,
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(first).toMatchObject({ expiresAt: 1000, sMaxAge: 0 });
		expect(fetchMock.mock.calls[1]?.[1]).not.toMatchObject({
			headers: { 'if-none-match': expect.any(String) },
		});
	});

	test('dedupes for a short floor when the backend sends no s-maxage', async () => {
		const fetchMock = createFetchMock(() => manifestResponse({}));
		const floorMs = MANIFEST_DEDUPE_TTL_SECONDS * 1000;

		const first = await fetchCachedManifest({
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		await fetchCachedManifest({
			fetch: fetchMock,
			now: 1000 + floorMs - 1,
			sourceURL: SOURCE_URL,
		});
		await fetchCachedManifest({
			fetch: fetchMock,
			now: 1000 + floorMs + 1,
			sourceURL: SOURCE_URL,
		});

		expect(first).toMatchObject({ expiresAt: 1000 + floorMs, sMaxAge: 0 });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('keys entries by the full request URL and honours a caller-owned cache', async () => {
		const fetchMock = createFetchMock(() =>
			manifestResponse({ 'cache-control': 'public, s-maxage=60' })
		);
		const cache = createManifestCache();

		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			query: 'preview=1',
			sourceURL: SOURCE_URL,
		});
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		await fetchCachedManifest({
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});

		expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
			`${SOURCE_URL}?preview=1`,
			SOURCE_URL,
			SOURCE_URL,
		]);
		expect(cache.get(`${SOURCE_URL}?preview=1`)).toBeDefined();

		clearManifestCache(cache);
		expect(cache.get(SOURCE_URL)).toBeUndefined();
	});

	test('rejects a non-2xx backend response', async () => {
		const fetchMock = createFetchMock(
			() => new Response('unavailable', { status: 503 })
		);

		await expect(
			fetchCachedManifest({ fetch: fetchMock, sourceURL: SOURCE_URL })
		).rejects.toThrow('c15t manifest cache: backend /manifest responded 503');
	});
});

describe('manifest source URLs', () => {
	test('prefers manifestURL and otherwise appends /manifest to backendURL', () => {
		expect(
			resolveManifestSourceURL({
				backendURL: 'https://backend.example',
				manifestURL: 'https://cdn.example/manifest.json',
			})
		).toBe('https://cdn.example/manifest.json');
		expect(resolveManifestSourceURL({ backendURL: '/api/c15t/' })).toBe(
			'/api/c15t/manifest'
		);
		expect(() => resolveManifestSourceURL({})).toThrow(
			'c15t manifest cache: `backendURL` or `manifestURL` is required.'
		);
	});

	test('appends a query with the right separator', () => {
		expect(createManifestRequestURL({ sourceURL: SOURCE_URL })).toBe(
			SOURCE_URL
		);
		expect(
			createManifestRequestURL({ query: 'a=1', sourceURL: SOURCE_URL })
		).toBe(`${SOURCE_URL}?a=1`);
		expect(
			createManifestRequestURL({
				query: 'a=1',
				sourceURL: `${SOURCE_URL}?x=y`,
			})
		).toBe(`${SOURCE_URL}?x=y&a=1`);
	});

	test('lists the headers a proxying route forwards, without vary', () => {
		expect(MANIFEST_PASSTHROUGH_HEADERS).toEqual([
			'cache-control',
			'etag',
			'last-modified',
			'content-language',
		]);
	});
});

describe('resolveManifestInit', () => {
	test('resolves init from request headers with resolvedOverrides', () => {
		const init = resolveManifestInit({
			headers: {
				'Accept-Language': 'de-DE,de;q=0.8,en;q=0.7',
				'x-c15t-country': ['DE'],
				'x-c15t-region': 'BE',
			},
			manifest: createManifestFixture(),
		});

		expect(init).toMatchObject({
			branding: 'c15t',
			jurisdiction: 'GDPR',
			location: { countryCode: 'DE', regionCode: 'BE' },
			policyResolution: {
				matchedBy: 'country',
				policyId: 'eu-opt-in',
				status: 'matched',
			},
			resolvedOverrides: { country: 'DE', language: 'de', region: 'BE' },
			translations: { language: 'de' },
		});
		expect(init).not.toHaveProperty('resolvedOverrides.gpc');
		expect(init).not.toHaveProperty('policySnapshotToken');
	});

	test('accepts a Headers instance', () => {
		const init = resolveManifestInit({
			headers: new Headers({
				'accept-language': 'en-US,en;q=0.9',
				'sec-gpc': '1',
				'x-vercel-ip-country': 'US',
				'x-vercel-ip-country-region': 'CA',
			}),
			manifest: createManifestFixture(),
		});

		expect(init).toMatchObject({
			policyResolution: { matchedBy: 'region', policyId: 'ca-opt-out' },
			resolvedOverrides: {
				country: 'US',
				language: 'en',
				region: 'CA',
			},
			resolvedPrivacySignals: { gpc: true },
		});
	});

	test('uses explicit resolver inputs as-is', () => {
		const init = resolveManifestInit({
			inputs: { country: null, gpc: false, language: 'en', region: null },
			manifest: createManifestFixture(),
		});

		expect(init).toMatchObject({
			location: { countryCode: null, regionCode: null },
			policyResolution: { matchedBy: 'fallback', policyId: 'eu-opt-in' },
			resolvedOverrides: { language: 'en' },
		});
		expect(init).not.toHaveProperty('resolvedOverrides.country');
	});

	test('maps Sec-GPC and geo headers to resolver inputs with an English fallback', () => {
		expect(
			getResolverInputsFromHeaders({
				'sec-gpc': '1',
				'x-vercel-ip-country': 'US',
				'x-vercel-ip-country-region': 'CA',
			})
		).toEqual({ country: 'US', gpc: true, language: 'en', region: 'CA' });
	});
});

describe('fetchCachedManifest: concurrency, explicit directives, headers', () => {
	const jsonManifest = function jsonManifest(headers: Record<string, string>) {
		return new Response(JSON.stringify(createManifestFixture()), {
			headers: { 'content-type': 'application/json', ...headers },
			status: 200,
		});
	};

	test('coalesces concurrent misses into one upstream request', async () => {
		const gate = (
			Promise as PromiseConstructor & {
				withResolvers: <Value>() => {
					promise: Promise<Value>;
					resolve: (value: Value) => void;
				};
			}
		).withResolvers<undefined>();
		const fetchMock = vi.fn(async () => {
			await gate.promise;
			return jsonManifest({ 'cache-control': 'public, s-maxage=60' });
		}) as unknown as ManifestFetch;
		const cache = createManifestCache();

		const first = fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		const second = fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		gate.resolve(undefined);
		const [a, b] = await Promise.all([first, second]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(b).toBe(a);
		// The in-flight slot is released, so a later miss fetches again.
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 100_000,
			sourceURL: SOURCE_URL,
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('treats an explicit s-maxage=0 as revalidate on every use', async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(jsonManifest({ 'cache-control': 'public, s-maxage=0' }))
		) as unknown as ManifestFetch;
		const cache = createManifestCache();

		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1500,
			sourceURL: SOURCE_URL,
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('forwards caller headers on the upstream request', async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(jsonManifest({ 'cache-control': 'public, s-maxage=60' }))
		) as unknown as ManifestFetch & ReturnType<typeof vi.fn>;

		await fetchCachedManifest({
			cache: createManifestCache(),
			fetch: fetchMock,
			headers: { authorization: 'Bearer token', cookie: 'c15t=abc' },
			now: 1000,
			sourceURL: SOURCE_URL,
		});

		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			headers: expect.objectContaining({
				accept: 'application/json',
				authorization: 'Bearer token',
				cookie: 'c15t=abc',
			}),
		});
	});
});

describe('fetchCachedManifest: restrictive directives and credential scope', () => {
	const jsonManifest = function jsonManifest(headers: Record<string, string>) {
		return new Response(JSON.stringify(createManifestFixture()), {
			headers: { 'content-type': 'application/json', ...headers },
			status: 200,
		});
	};
	const countingFetch = function countingFetch(cacheControl: string) {
		return vi.fn(() =>
			Promise.resolve(jsonManifest({ 'cache-control': cacheControl }))
		) as unknown as ManifestFetch & ReturnType<typeof vi.fn>;
	};

	test.each([
		'private, s-maxage=60',
		'no-cache, s-maxage=60',
		'no-store, s-maxage=60',
	])(
		'never caches "%s" even though s-maxage is positive',
		async (cacheControl) => {
			const fetchMock = countingFetch(cacheControl);
			const cache = createManifestCache();
			await fetchCachedManifest({
				cache,
				fetch: fetchMock,
				now: 1000,
				sourceURL: SOURCE_URL,
			});
			await fetchCachedManifest({
				cache,
				fetch: fetchMock,
				now: 1500,
				sourceURL: SOURCE_URL,
			});
			expect(fetchMock).toHaveBeenCalledTimes(2);
		}
	);

	test('partitions entries and in-flight requests by forwarded credentials', async () => {
		const fetchMock = countingFetch('public, s-maxage=60');
		const cache = createManifestCache();
		const tenantA = { authorization: 'Bearer a' };
		const tenantB = { authorization: 'Bearer b' };

		await Promise.all([
			fetchCachedManifest({
				cache,
				fetch: fetchMock,
				headers: tenantA,
				now: 1000,
				sourceURL: SOURCE_URL,
			}),
			fetchCachedManifest({
				cache,
				fetch: fetchMock,
				headers: tenantB,
				now: 1000,
				sourceURL: SOURCE_URL,
			}),
		]);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			headers: tenantA,
			now: 2000,
			sourceURL: SOURCE_URL,
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);

		// The plain, credential-less entry is separate from both.
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 2000,
			sourceURL: SOURCE_URL,
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	test('refuses to send credentials over plain http to a non-loopback host', async () => {
		const fetchMock = countingFetch('public, s-maxage=60');
		await expect(
			fetchCachedManifest({
				cache: createManifestCache(),
				fetch: fetchMock,
				headers: { cookie: 'c15t=abc' },
				sourceURL: 'http://backend.example/manifest',
			})
		).rejects.toThrow(/refusing to send credentials over http/u);
		expect(fetchMock).not.toHaveBeenCalled();

		await fetchCachedManifest({
			cache: createManifestCache(),
			fetch: fetchMock,
			headers: { cookie: 'c15t=abc' },
			sourceURL: 'http://localhost:3010/manifest',
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('clearManifestCache during an in-flight fill', () => {
	test('drops the pending fill and never stores its result', async () => {
		const gate = (
			Promise as PromiseConstructor & {
				withResolvers: <Value>() => {
					promise: Promise<Value>;
					resolve: (value: Value) => void;
				};
			}
		).withResolvers<undefined>();
		const fetchMock = vi.fn(async () => {
			await gate.promise;
			return new Response(JSON.stringify(createManifestFixture()), {
				headers: { 'cache-control': 'public, s-maxage=60' },
				status: 200,
			});
		}) as unknown as ManifestFetch;
		const cache = createManifestCache();

		const stale = fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		clearManifestCache(cache);
		// A caller arriving after the clear starts a fresh fill.
		const fresh = fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

		gate.resolve(undefined);
		await Promise.all([stale, fresh]);
		// Only the post-clear fill is stored.
		expect(cache.get(SOURCE_URL)).toBe(await fresh);
	});
});

describe('fetchCachedManifest: upstream Age', () => {
	test('grants only the remaining lifetime and reports a running age', async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify(createManifestFixture()), {
					headers: { age: '119', 'cache-control': 'public, s-maxage=120' },
					status: 200,
				})
			)
		) as unknown as ManifestFetch;
		const cache = createManifestCache();
		const entry = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 10_000,
			sourceURL: SOURCE_URL,
		});

		expect(entry.expiresAt).toBe(11_000);
		expect(entry.upstreamAge).toBe(119);
		expect(getManifestAge(entry, 15_000)).toBe(124);

		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 12_000,
			sourceURL: SOURCE_URL,
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('does not store an entry the upstream already aged out', async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify(createManifestFixture()), {
					headers: { age: '200', 'cache-control': 'public, s-maxage=120' },
					status: 200,
				})
			)
		) as unknown as ManifestFetch;
		const cache = createManifestCache();
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 10_000,
			sourceURL: SOURCE_URL,
		});
		expect(cache.get(SOURCE_URL)).toBeUndefined();
	});
});

describe('clearManifestCache during cache-key construction', () => {
	test('a clear that lands while the key is digested cannot seed the new in-flight map', async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify(createManifestFixture()), {
					headers: { 'cache-control': 'public, s-maxage=60' },
					status: 200,
				})
			)
		) as unknown as ManifestFetch;
		const cache = createManifestCache();
		const headers = { authorization: 'Bearer scope' };

		// Credentialed keys are digested asynchronously, so the clear runs
		// between capturing the generation and registering the fill.
		const early = fetchCachedManifest({
			cache,
			fetch: fetchMock,
			headers,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		clearManifestCache(cache);
		await early;
		const later = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			headers,
			now: 1000,
			sourceURL: SOURCE_URL,
		});

		// The early fill restarted after the clear and stored under the new
		// generation, so the later call is a cache hit on a post-clear entry.
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(later).toBe(await early);
	});
});

describe('credential-scoped keys without WebCrypto', () => {
	test('never embed the credential value in the key', async () => {
		const subtle = globalThis.crypto?.subtle;
		Object.defineProperty(globalThis.crypto, 'subtle', {
			configurable: true,
			value: undefined,
		});
		try {
			const fetchMock = vi.fn(() =>
				Promise.resolve(
					new Response(JSON.stringify(createManifestFixture()), {
						headers: { 'cache-control': 'public, s-maxage=60' },
						status: 200,
					})
				)
			) as unknown as ManifestFetch;
			const seen: string[] = [];
			const store = createManifestCache();
			const cache = {
				clear: () => store.clear(),
				delete: (key: string) => store.delete(key),
				get: (key: string) => {
					seen.push(key);
					return store.get(key);
				},
				set: (key: string, entry: Parameters<typeof store.set>[1]) =>
					store.set(key, entry),
			};
			await fetchCachedManifest({
				cache,
				fetch: fetchMock,
				headers: { authorization: 'Bearer top-secret' },
				now: 1000,
				sourceURL: SOURCE_URL,
			});
			expect(seen.length).toBeGreaterThan(0);
			for (const key of seen) {
				expect(key).not.toContain('top-secret');
				expect(key.startsWith(`${SOURCE_URL}#`)).toBe(true);
			}
		} finally {
			Object.defineProperty(globalThis.crypto, 'subtle', {
				configurable: true,
				value: subtle,
			});
		}
	});
});

describe('fetchCachedManifest: custom identity headers over cleartext', () => {
	test('refuses a caller-supplied header such as x-api-key over remote http', async () => {
		const fetchMock = createFetchMock(() =>
			manifestResponse({ 'cache-control': 'public, s-maxage=60' })
		);
		await expect(
			fetchCachedManifest({
				cache: createManifestCache(),
				fetch: fetchMock,
				headers: { 'x-api-key': 'tenant-a' },
				sourceURL: 'http://backend.example/manifest',
			})
		).rejects.toThrow(/refusing to send credentials over http .*x-api-key/u);
		expect(fetchMock).not.toHaveBeenCalled();

		await fetchCachedManifest({
			cache: createManifestCache(),
			fetch: fetchMock,
			headers: { 'accept-language': 'de', 'x-api-key': 'tenant-a' },
			sourceURL: 'https://backend.example/manifest',
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('fetchCachedManifest: stale-while-revalidate', () => {
	const SWR_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=120';

	test('a fresh replacement is not held back by the dedupe floor', async () => {
		// A backend with `s-maxage` under the five-second floor must still be
		// revalidated on its own schedule once a refresh lands fresh.
		const cache = createManifestCache();
		const fetchMock = vi.fn(() =>
			Promise.resolve(
				manifestResponse({
					'cache-control': 'public, s-maxage=1, stale-while-revalidate=60',
					etag: '"manifest-rev-1"',
				})
			)
		) as unknown as ManifestFetch;

		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 0,
			sourceURL: SOURCE_URL,
		});
		// Stale at 1.5 s: one background fill, answered fresh (expires 2.5 s).
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1500,
			sourceURL: SOURCE_URL,
		});
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		await vi.waitFor(() => expect(cache.get(SOURCE_URL)?.expiresAt).toBe(2500));
		// Stale again at 3 s, well inside what would have been a 6.5 s floor:
		// the refreshed entry's own expiry governs, so another fill starts.
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 3000,
			sourceURL: SOURCE_URL,
		});
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
	});

	test('throttles revalidation per key even when the cache returns a fresh object on every read', async () => {
		// A serialising cache (KV, structured clone) never returns the same
		// object twice, so the floor cannot hang off entry identity.
		const store = new Map<string, string>();
		const cloning: ManifestCache = {
			clear: () => store.clear(),
			delete: (key) => store.delete(key),
			get: (key) => {
				const raw = store.get(key);
				return raw ? (JSON.parse(raw) as CachedManifestResponse) : undefined;
			},
			set: (key, entry) => store.set(key, JSON.stringify(entry)),
		};
		const gate = Promise.withResolvers<undefined>();
		let requests = 0;
		const fetchMock = vi.fn(async () => {
			requests += 1;
			if (requests === 1) {
				return manifestResponse({
					'cache-control': SWR_CACHE_CONTROL,
					etag: '"manifest-rev-1"',
				});
			}
			await gate.promise;
			throw new Error('network down');
		}) as unknown as ManifestFetch;

		await fetchCachedManifest({
			cache: cloning,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		for (const now of [70_000, 70_100, 70_200]) {
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design.
			await fetchCachedManifest({
				cache: cloning,
				fetch: fetchMock,
				now,
				sourceURL: SOURCE_URL,
			});
		}
		expect(fetchMock).toHaveBeenCalledTimes(2);
		gate.resolve(undefined);
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		await fetchCachedManifest({
			cache: cloning,
			fetch: fetchMock,
			now: 74_000,
			sourceURL: SOURCE_URL,
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		await fetchCachedManifest({
			cache: cloning,
			fetch: fetchMock,
			now: 76_000,
			sourceURL: SOURCE_URL,
		});
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
	});

	test('grants no stale window without an explicit s-maxage', async () => {
		// `max-age` alone never opted into shared caching; the 5 s dedupe floor
		// is not a freshness lifetime to extend by a day.
		const cache = createManifestCache();
		const fetchMock = vi.fn(() =>
			Promise.resolve(
				manifestResponse({
					'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
				})
			)
		) as unknown as ManifestFetch;
		const entry = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		expect(entry.expiresAt).toBe(1000 + MANIFEST_DEDUPE_TTL_SECONDS * 1000);
		expect(entry.staleUntil).toBe(entry.expiresAt);
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 7000,
			sourceURL: SOURCE_URL,
		});
		// Past the floor the call blocked on a fresh fetch, as before.
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('keeps the stale window for an explicit s-maxage=0 and blocks only for no-store', async () => {
		const cache = createManifestCache();
		const fetchMock = vi.fn(() =>
			Promise.resolve(
				manifestResponse({
					'cache-control': 'public, s-maxage=0, stale-while-revalidate=120',
					etag: '"manifest-rev-1"',
				})
			)
		) as unknown as ManifestFetch;

		const first = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		expect(first).toMatchObject({ expiresAt: 1000, staleUntil: 121_000 });
		expect(cache.get(SOURCE_URL)).toBe(first);

		// Stale on arrival, so the next read is served from memory with one
		// background revalidation rather than a blocking fetch.
		const served = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 2000,
			sourceURL: SOURCE_URL,
		});
		expect(served).toBe(first);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

		const noStore = createManifestCache();
		const noStoreFetch = vi.fn(() =>
			Promise.resolve(
				manifestResponse({
					'cache-control': 'no-store, stale-while-revalidate=120',
				})
			)
		) as unknown as ManifestFetch;
		await fetchCachedManifest({
			cache: noStore,
			fetch: noStoreFetch,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		expect(noStore.get(SOURCE_URL)).toBeUndefined();
	});

	test('a background revalidation answered with an uncacheable 200 evicts the stale entry', async () => {
		const cache = createManifestCache();
		let requests = 0;
		const fetchMock = vi.fn(() => {
			requests += 1;
			if (requests === 1) {
				return Promise.resolve(
					manifestResponse({
						'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
						etag: '"manifest-rev-1"',
					})
				);
			}
			return Promise.resolve(
				manifestResponse(
					{ 'cache-control': 'private, no-store' },
					createManifestFixture('manifest-rev-2')
				)
			);
		}) as unknown as ManifestFetch;

		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 0,
			sourceURL: SOURCE_URL,
		});
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 61_000,
			sourceURL: SOURCE_URL,
		});
		await vi.waitFor(() => expect(cache.get(SOURCE_URL)).toBeUndefined());
	});

	test('a background revalidation ignores the triggering request signal and keeps its own timeout', async () => {
		const cache = createManifestCache();
		const controller = new AbortController();
		let requests = 0;
		const fetchMock = vi.fn((_input: unknown, init?: RequestInit) => {
			requests += 1;
			if (requests === 1) {
				return Promise.resolve(
					manifestResponse({
						'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
						etag: '"manifest-rev-1"',
					})
				);
			}
			return new Promise<Response>((resolve, reject) => {
				init?.signal?.addEventListener('abort', () =>
					reject(init.signal?.reason)
				);
				setTimeout(() => {
					resolve(
						new Response(null, {
							headers: {
								'cache-control':
									'public, s-maxage=60, stale-while-revalidate=600',
								etag: '"manifest-rev-1"',
							},
							status: 304,
						})
					);
				}, 20);
			});
		}) as unknown as ManifestFetch;

		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 0,
			sourceURL: SOURCE_URL,
		});
		const stale = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			init: { signal: controller.signal },
			now: 61_000,
			sourceURL: SOURCE_URL,
		});
		// The request that triggered the refresh is over and cancelled.
		controller.abort(new Error('request finished'));
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		const backgroundInit = (fetchMock as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[1]?.[1] as RequestInit | undefined;
		expect(backgroundInit?.signal).not.toBe(controller.signal);
		expect(backgroundInit?.signal?.aborted).toBe(false);
		// The refresh still lands.
		await vi.waitFor(() =>
			expect(cache.get(SOURCE_URL)?.fetchedAt).toBe(61_000)
		);
		expect(cache.get(SOURCE_URL)).not.toBe(stale);
	});

	test('the revalidation floor counts from when a slow background fill settles', async () => {
		vi.useFakeTimers();
		try {
			const cache = createManifestCache();
			let requests = 0;
			const fetchMock = vi.fn(() => {
				requests += 1;
				if (requests === 1) {
					return Promise.resolve(
						manifestResponse({
							'cache-control':
								'public, s-maxage=60, stale-while-revalidate=600',
							etag: '"manifest-rev-1"',
						})
					);
				}
				// Every revalidation takes 8 s of wall time and then fails.
				return new Promise<Response>((_resolve, reject) => {
					setTimeout(() => reject(new Error('upstream down')), 8000);
				});
			}) as unknown as ManifestFetch;

			await fetchCachedManifest({
				cache,
				fetch: fetchMock,
				now: 0,
				sourceURL: SOURCE_URL,
			});
			await fetchCachedManifest({
				cache,
				fetch: fetchMock,
				now: 61_000,
				sourceURL: SOURCE_URL,
			});
			expect(fetchMock).toHaveBeenCalledTimes(2);
			await vi.advanceTimersByTimeAsync(8000);

			// 8 s of wall time have passed since the fill started, but the floor
			// began when it settled, so a read 1 s later must not refetch.
			await fetchCachedManifest({
				cache,
				fetch: fetchMock,
				now: 70_000,
				sourceURL: SOURCE_URL,
			});
			expect(fetchMock).toHaveBeenCalledTimes(2);
			await fetchCachedManifest({
				cache,
				fetch: fetchMock,
				now: 74_500,
				sourceURL: SOURCE_URL,
			});
			expect(fetchMock).toHaveBeenCalledTimes(3);
		} finally {
			vi.useRealTimers();
		}
	});

	test('a revalidation answered already stale by a CDN does not revalidate again before the dedupe floor', async () => {
		// A CDN whose origin is down keeps answering 304 with an Age past
		// s-maxage, so every refreshed entry is stale on arrival.
		let requests = 0;
		const fetchMock = vi.fn(() => {
			requests += 1;
			if (requests === 1) {
				return Promise.resolve(
					manifestResponse({
						'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
						etag: '"manifest-rev-1"',
					})
				);
			}
			return Promise.resolve(
				new Response(null, {
					headers: {
						age: '90',
						'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
						etag: '"manifest-rev-1"',
					},
					status: 304,
				})
			);
		}) as unknown as ManifestFetch;
		const cache = createManifestCache();

		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 0,
			sourceURL: SOURCE_URL,
		});
		// Stale: one background revalidation, answered already stale.
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 61_000,
			sourceURL: SOURCE_URL,
		});
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		const replaced = cache.get(SOURCE_URL);
		expect(replaced?.expiresAt).toBe(61_000);

		// Inside the floor: served from the replaced entry, no new request.
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 62_000,
			sourceURL: SOURCE_URL,
		});
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 65_000,
			sourceURL: SOURCE_URL,
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);

		// Past the floor (which runs from settlement, a few real milliseconds
		// after 61_000): exactly one more revalidation.
		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 67_000,
			sourceURL: SOURCE_URL,
		});
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
	});

	test('serves a stale entry synchronously from memory, then serves the refreshed entry after the background revalidation settles', async () => {
		const cache = createManifestCache();
		const gate = Promise.withResolvers<undefined>();
		let requests = 0;
		const fetchMock = vi.fn(async () => {
			requests += 1;
			if (requests === 1) {
				return manifestResponse({
					'cache-control': SWR_CACHE_CONTROL,
					etag: '"manifest-rev-1"',
				});
			}
			await gate.promise;
			return new Response(null, {
				headers: { 'cache-control': SWR_CACHE_CONTROL },
				status: 304,
			});
		}) as unknown as ManifestFetch & ReturnType<typeof vi.fn>;

		const first = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		expect(first).toMatchObject({ expiresAt: 61_000, staleUntil: 181_000 });

		const staleNow = 70_000;
		const served = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow,
			sourceURL: SOURCE_URL,
		});

		expect(served).toBe(first);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
			headers: { 'if-none-match': '"manifest-rev-1"' },
		});

		gate.resolve(undefined);
		await vi.waitFor(() =>
			expect(cache.get(SOURCE_URL)?.fetchedAt).toBe(staleNow)
		);

		const next = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow + 1000,
			sourceURL: SOURCE_URL,
		});
		expect(next).toMatchObject({ expiresAt: staleNow + 60_000 });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('concurrent stale reads trigger exactly one background revalidation', async () => {
		const cache = createManifestCache();
		const gate = Promise.withResolvers<undefined>();
		let requests = 0;
		const fetchMock = vi.fn(async () => {
			requests += 1;
			if (requests === 1) {
				return manifestResponse({
					'cache-control': SWR_CACHE_CONTROL,
					etag: '"manifest-rev-1"',
				});
			}
			await gate.promise;
			return new Response(null, {
				headers: { 'cache-control': SWR_CACHE_CONTROL },
				status: 304,
			});
		}) as unknown as ManifestFetch;

		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});

		const staleNow = 70_000;
		const results = await Promise.all(
			Array.from({ length: 5 }, () =>
				fetchCachedManifest({
					cache,
					fetch: fetchMock,
					now: staleNow,
					sourceURL: SOURCE_URL,
				})
			)
		);

		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		for (const result of results) {
			expect(result).toBe(results[0]);
		}

		gate.resolve(undefined);
		await vi.waitFor(() =>
			expect(cache.get(SOURCE_URL)?.fetchedAt).toBe(staleNow)
		);
	});

	test('a rejected background revalidation keeps serving the stale entry and retries only after the dedupe floor', async () => {
		const cache = createManifestCache();
		const gate = Promise.withResolvers<undefined>();
		let requests = 0;
		const fetchMock = vi.fn(async () => {
			requests += 1;
			if (requests === 1) {
				return manifestResponse({ 'cache-control': SWR_CACHE_CONTROL });
			}
			await gate.promise;
			throw new Error('network down');
		}) as unknown as ManifestFetch;

		const first = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});

		const staleNow = 70_000;
		const served = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow,
			sourceURL: SOURCE_URL,
		});
		expect(served).toBe(first);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		// Release the failing fill and let its catch/finally set the floor.
		gate.resolve(undefined);
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(cache.get(SOURCE_URL)).toBe(first);

		const stillThrottled = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow + 4000,
			sourceURL: SOURCE_URL,
		});
		expect(stillThrottled).toBe(first);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		// The floor runs from when the fill settled, a few real milliseconds
		// after `staleNow`, so probe with a second of slack.
		const retried = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow + 6000,
			sourceURL: SOURCE_URL,
		});
		expect(retried).toBe(first);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
	});

	test('a background revalidation answered with 500 keeps serving the stale entry and retries only after the dedupe floor', async () => {
		const cache = createManifestCache();
		const gate = Promise.withResolvers<undefined>();
		let requests = 0;
		const fetchMock = vi.fn(async () => {
			requests += 1;
			if (requests === 1) {
				return manifestResponse({ 'cache-control': SWR_CACHE_CONTROL });
			}
			await gate.promise;
			return new Response('unavailable', { status: 500 });
		}) as unknown as ManifestFetch;

		const first = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});

		const staleNow = 70_000;
		const served = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow,
			sourceURL: SOURCE_URL,
		});
		expect(served).toBe(first);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		gate.resolve(undefined);
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(cache.get(SOURCE_URL)).toBe(first);

		const stillThrottled = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow + 4000,
			sourceURL: SOURCE_URL,
		});
		expect(stillThrottled).toBe(first);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		// The floor runs from when the fill settled, a few real milliseconds
		// after `staleNow`, so probe with a second of slack.
		const retried = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow + 6000,
			sourceURL: SOURCE_URL,
		});
		expect(retried).toBe(first);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
	});

	test('blocks on the upstream once staleUntil has passed and returns the fresh result', async () => {
		const cache = createManifestCache();
		let requests = 0;
		const fetchMock = vi.fn(() => {
			requests += 1;
			if (requests === 1) {
				return Promise.resolve(
					manifestResponse(
						{ 'cache-control': SWR_CACHE_CONTROL },
						createManifestFixture('manifest-rev-1')
					)
				);
			}
			return Promise.resolve(
				manifestResponse(
					{ 'cache-control': SWR_CACHE_CONTROL },
					createManifestFixture('manifest-rev-2')
				)
			);
		}) as unknown as ManifestFetch;

		const first = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		expect(first.staleUntil).toBe(181_000);

		const result = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 181_000,
			sourceURL: SOURCE_URL,
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(result).not.toBe(first);
		expect(result.manifest.revision).toBe('manifest-rev-2');
	});

	test('with no stale-while-revalidate directive, staleUntil equals expiresAt and an expired entry blocks', async () => {
		const cache = createManifestCache();
		let requests = 0;
		const fetchMock = vi.fn(() => {
			requests += 1;
			if (requests === 1) {
				return Promise.resolve(
					manifestResponse(
						{ 'cache-control': 'public, s-maxage=60' },
						createManifestFixture('manifest-rev-1')
					)
				);
			}
			return Promise.resolve(
				manifestResponse(
					{ 'cache-control': 'public, s-maxage=60' },
					createManifestFixture('manifest-rev-2')
				)
			);
		}) as unknown as ManifestFetch;

		const first = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		expect(first.staleUntil).toBe(first.expiresAt);
		expect(first.staleUntil).toBe(61_000);

		const result = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 61_000,
			sourceURL: SOURCE_URL,
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(result).not.toBe(first);
		expect(result.manifest.revision).toBe('manifest-rev-2');
	});

	test('stores a response the CDN is already serving stale as an already-stale entry, and serves it with a background revalidation', async () => {
		const cache = createManifestCache();
		const fetchMock = createFetchMock(() =>
			manifestResponse({
				age: '350',
				'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
			})
		);

		const now = 10_000;
		const first = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now,
			sourceURL: SOURCE_URL,
		});

		expect(first.expiresAt).toBe(now);
		expect(first.staleUntil).toBe(now + 86_350_000);
		expect(cache.get(SOURCE_URL)).toBe(first);

		const second = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: now + 1,
			sourceURL: SOURCE_URL,
		});
		expect(second).toBe(first);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
	});

	test('does not store a response whose Age is beyond the whole stale-while-revalidate window', async () => {
		const cache = createManifestCache();
		const fetchMock = createFetchMock(() =>
			manifestResponse({
				age: '90000',
				'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
			})
		);

		await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 10_000,
			sourceURL: SOURCE_URL,
		});

		expect(cache.get(SOURCE_URL)).toBeUndefined();
	});

	test('a background revalidation answered with a new manifest revision replaces the stale entry', async () => {
		const cache = createManifestCache();
		let requests = 0;
		const fetchMock = vi.fn(() => {
			requests += 1;
			if (requests === 1) {
				return Promise.resolve(
					manifestResponse(
						{ 'cache-control': SWR_CACHE_CONTROL },
						createManifestFixture('manifest-rev-1')
					)
				);
			}
			return Promise.resolve(
				manifestResponse(
					{ 'cache-control': SWR_CACHE_CONTROL },
					createManifestFixture('manifest-rev-2')
				)
			);
		}) as unknown as ManifestFetch;

		const first = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});
		expect(first.manifest.revision).toBe('manifest-rev-1');

		const staleNow = 70_000;
		const served = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow,
			sourceURL: SOURCE_URL,
		});
		expect(served.manifest.revision).toBe('manifest-rev-1');

		await vi.waitFor(() =>
			expect(cache.get(SOURCE_URL)?.manifest.revision).toBe('manifest-rev-2')
		);

		const next = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow + 1000,
			sourceURL: SOURCE_URL,
		});
		expect(next.manifest.revision).toBe('manifest-rev-2');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('clearManifestCache during a background revalidation drops its result', async () => {
		const cache = createManifestCache();
		const gate = Promise.withResolvers<undefined>();
		let requests = 0;
		const fetchMock = vi.fn(async () => {
			requests += 1;
			if (requests === 1) {
				return manifestResponse({ 'cache-control': SWR_CACHE_CONTROL });
			}
			await gate.promise;
			return manifestResponse(
				{ 'cache-control': SWR_CACHE_CONTROL },
				createManifestFixture('manifest-rev-2')
			);
		}) as unknown as ManifestFetch;

		const first = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: 1000,
			sourceURL: SOURCE_URL,
		});

		const staleNow = 70_000;
		const served = await fetchCachedManifest({
			cache,
			fetch: fetchMock,
			now: staleNow,
			sourceURL: SOURCE_URL,
		});
		expect(served).toBe(first);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

		clearManifestCache(cache);
		gate.resolve(undefined);
		// Give the background fill's continuation a turn; its result must not
		// land in the cache the clear just emptied.
		await new Promise((resolve) => {
			setTimeout(resolve, 5);
		});
		expect(cache.get(SOURCE_URL)).toBeUndefined();
	});
});
