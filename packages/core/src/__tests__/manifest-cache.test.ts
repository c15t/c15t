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
import type { ManifestFetch } from '../transports/manifest-cache';
import { C15T_VERSION_HEADER } from '../transports/version-header';

const SOURCE_URL = 'https://backend.example/manifest';

const createManifestFixture = function createManifestFixture(
	revision = 'manifest-rev-1'
): ConsentManifest {
	return {
		branding: 'c15t',
		policyPacks: [
			createConsentManifestPolicyPack({
				fingerprint: 'fingerprint-eu',
				policy: {
					consent: {
						categories: ['necessary', 'measurement', 'marketing'],
						expiryDays: 365,
						model: 'opt-in',
						scopeMode: 'strict',
					},
					id: 'eu-opt-in',
					match: { countries: ['DE'], fallback: true },
					ui: { mode: 'banner' },
				},
			}),
			createConsentManifestPolicyPack({
				fingerprint: 'fingerprint-ca',
				policy: {
					consent: {
						categories: ['necessary', 'marketing'],
						expiryDays: 365,
						gpc: true,
						model: 'opt-out',
						scopeMode: 'permissive',
					},
					id: 'ca-opt-out',
					match: { regions: [{ country: 'US', region: 'CA' }] },
					ui: { mode: 'banner' },
				},
			}),
		],
		revision,
		schemaVersion: 1,
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
			policy: { id: 'eu-opt-in', model: 'opt-in' },
			policyDecision: {
				country: 'DE',
				fingerprint: 'fingerprint-eu',
				matchedBy: 'country',
				policyId: 'eu-opt-in',
				region: 'BE',
			},
			resolvedOverrides: { country: 'DE', language: 'de', region: 'BE' },
			translations: { language: 'de' },
		});
		expect(init.resolvedOverrides).not.toHaveProperty('gpc');
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
			policy: { id: 'ca-opt-out', model: 'opt-out' },
			policyDecision: { matchedBy: 'region', policyId: 'ca-opt-out' },
			resolvedOverrides: {
				country: 'US',
				gpc: true,
				language: 'en',
				region: 'CA',
			},
		});
	});

	test('uses explicit resolver inputs as-is', () => {
		const init = resolveManifestInit({
			inputs: { country: null, gpc: false, language: 'en', region: null },
			manifest: createManifestFixture(),
		});

		expect(init).toMatchObject({
			location: { countryCode: null, regionCode: null },
			policyDecision: { matchedBy: 'fallback', policyId: 'eu-opt-in' },
			resolvedOverrides: { gpc: false, language: 'en' },
		});
		expect(init.resolvedOverrides).not.toHaveProperty('country');
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
