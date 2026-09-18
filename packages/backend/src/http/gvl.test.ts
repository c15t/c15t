/**
 * GVL resolution.
 *
 * The behaviours worth testing are the failure and contention ones: this sits
 * on the critical rendering path, calls a third party, and is hit by every
 * concurrent visitor at once when a cache goes cold.
 */

import type { GlobalVendorList } from '@c15t/schema';
import { assert, describe, it } from 'vitest';

import {
	gvlCacheKey,
	MAX_GVL_QUERY_VENDOR_IDS,
	narrowToDeclaredScope,
	parseVendorScopeHeader,
	resolveGvl,
	VENDOR_SCOPE_HEADER,
} from './gvl';
import type { CacheAdapter } from './gvl';

/** Minimal document satisfying `globalVendorListSchema`. */
const GVL = {
	features: {},
	gvlSpecificationVersion: 3,
	lastUpdated: '2026-01-01T00:00:00Z',
	purposes: {},
	specialFeatures: {},
	specialPurposes: {},
	stacks: {},
	tcfPolicyVersion: 4,
	vendorListVersion: 1,
	vendors: {},
};

const memoryCache = (): CacheAdapter & { entries: Map<string, unknown> } => {
	const entries = new Map<string, unknown>();
	return {
		delete: (key) => {
			entries.delete(key);
		},
		entries,
		get: <T>(key: string) => (entries.get(key) as T) ?? null,
		has: (key) => entries.has(key),
		set: (key, value) => {
			entries.set(key, value);
		},
	};
};

const respondWith = (body: unknown, ok = true) =>
	(() =>
		new Response(JSON.stringify(body), {
			status: ok ? 200 : 500,
		})) as unknown as typeof globalThis.fetch;

/** A vendor entry complete enough for `gvlVendorSchema`. */
const vendor = (id: number) => ({
	cookieMaxAgeSeconds: null,
	cookieRefresh: false,
	features: [],
	flexiblePurposes: [],
	id,
	legIntPurposes: [],
	name: `Vendor ${id}`,
	purposes: [1],
	specialFeatures: [],
	specialPurposes: [],
	urls: [],
	usesCookies: false,
	usesNonCookieAccess: false,
});

/**
 * The document one publisher's upstream returns. 999 is in that document and
 * outside every allowlist below, so a scope that failed to apply shows up as a
 * vendor nobody disclosed rather than as a vendor nobody notices.
 */
const LIST = {
	...GVL,
	// oxlint-disable-next-line sort-keys -- Ids read in numeric order, and the assertions below name them one at a time.
	vendors: { 7: vendor(7), 41: vendor(41), 672: vendor(672), 999: vendor(999) },
};

/** The scope that publisher configured, which is also the cache key's scope. */
const CONFIGURED = [7, 41, 672];

/** The vendor ids a response actually carries, in document order. */
const servedKeys = (gvl: GlobalVendorList | null) => {
	if (gvl === null) {
		throw new Error('Expected a vendor list, got null');
	}
	return Object.keys(gvl.vendors);
};

/** A fetch stub that answers with `body` and records the URL it was called with. */
const recordUrl = (body: unknown) => {
	const urls: string[] = [];
	const fetchImpl = ((input: RequestInfo | URL) => {
		urls.push(String(input));
		return Promise.resolve(new Response(JSON.stringify(body)));
	}) as unknown as typeof globalThis.fetch;
	return { fetchImpl, urls };
};

describe('gvl cache key', () => {
	it('treats a reordered vendor list as the same list', () => {
		// The same set in a different order is the same document; separate keys
		// would multiply entries and miss rates for nothing.
		assert.strictEqual(
			gvlCacheKey('https://e', 'en', [3, 1, 2]),
			gvlCacheKey('https://e', 'en', [1, 2, 3])
		);
	});

	it('separates languages and endpoints', () => {
		assert.notStrictEqual(
			gvlCacheKey('https://e', 'en', undefined),
			gvlCacheKey('https://e', 'de', undefined)
		);
		assert.notStrictEqual(
			gvlCacheKey('https://a', 'en', undefined),
			gvlCacheKey('https://b', 'en', undefined)
		);
	});
});

describe('resolveGvl', () => {
	it('fetches and caches', async () => {
		const cache = memoryCache();
		let calls = 0;
		const fetchOnce = (() => {
			calls += 1;
			return new Response(JSON.stringify(GVL));
		}) as unknown as typeof globalThis.fetch;

		const first = await resolveGvl('en', { cache, fetch: fetchOnce });
		const second = await resolveGvl('en', { cache, fetch: fetchOnce });

		assert.isNotNull(first);
		assert.deepStrictEqual(second, first);
		assert.strictEqual(calls, 1, 'second call should be served from cache');
	});

	it('treats a regional tag as its primary subtag', async () => {
		const cache = memoryCache();
		await resolveGvl('de-DE', { cache, fetch: respondWith(GVL) });
		// 'de-DE' and 'de' are the same published document.
		assert.isTrue(
			cache.entries.has(gvlCacheKey('https://gvl.inth.app', 'de', undefined))
		);
	});

	it('returns null rather than throwing when the upstream fails', async () => {
		// A missing GVL degrades the IAB experience; a thrown error would fail
		// /init entirely and leave the visitor with no consent UI at all.
		assert.isNull(await resolveGvl('en', { fetch: respondWith(GVL, false) }));
		assert.isNull(
			await resolveGvl('en', {
				fetch: (() => {
					throw new Error('network down');
				}) as unknown as typeof globalThis.fetch,
			})
		);
	});

	it('rejects and does not cache a malformed document', async () => {
		const cache = memoryCache();
		const result = await resolveGvl('en', {
			cache,
			fetch: respondWith({ nonsense: true }),
		});

		assert.isNull(result);
		// Caching a malformed document would persist the upstream's mistake.
		assert.strictEqual(cache.entries.size, 0);
	});

	it('shares one fetch across concurrent misses', async () => {
		const cache = memoryCache();
		let calls = 0;
		const slow = (async () => {
			calls += 1;
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
			return new Response(JSON.stringify(GVL));
		}) as unknown as typeof globalThis.fetch;

		// A cold cache under load means every request misses at once. Without
		// in-flight sharing they would each fetch the same large document.
		const results = await Promise.all([
			resolveGvl('fr', { cache, fetch: slow }),
			resolveGvl('fr', { cache, fetch: slow }),
			resolveGvl('fr', { cache, fetch: slow }),
		]);

		assert.strictEqual(calls, 1);
		for (const result of results) {
			assert.isNotNull(result);
		}
	});

	it('requests the document at the endpoint itself', async () => {
		// The upstream serves the list at its root and answers `/en.json` with a
		// 404, so a per-language path silently means every IAB deployment gets
		// no GVL at all. This is the assertion that let that ship.
		const { fetchImpl, urls } = recordUrl(GVL);
		await resolveGvl('de-DE', { fetch: fetchImpl });

		assert.deepEqual(urls, ['https://gvl.inth.app']);
	});

	it('sends a scoped allowlist as a server-side filter', async () => {
		// Its own endpoint: `inflight` is module-scoped, and a request that
		// shares a cache key with one another test made this one observe a
		// promise instead of its own fetch.
		const { fetchImpl, urls } = recordUrl(GVL);
		await resolveGvl('en', {
			endpoint: 'https://gvl-filter.test',
			fetch: fetchImpl,
			vendorIds: [3, 1, 2],
		});

		// Sorted, so one allowlist is one cache key and one upstream URL.
		assert.match(
			urls[0] ?? '',
			/^https:\/\/gvl-filter\.test\?vendorIds=1(?:%2C|,)2(?:%2C|,)3$/u
		);
	});

	it('narrows an allowlist too wide for a request line, locally', async () => {
		// Above the query cap the upstream gets no filter and returns every
		// vendor. The filter still has to happen: handing a visitor the full GVL
		// because a publisher scoped wide would disclose partners nobody asked
		// to disclose, and the narrowed document is what belongs in the cache.
		const wide = [1, ...Array.from({ length: 500 }, (_, i) => i + 1000)];
		const doc = {
			...GVL,
			vendors: { 1: vendor(1), 2: vendor(2), 3: vendor(3) },
		};
		const cache = memoryCache();
		const { fetchImpl, urls } = recordUrl(doc);

		const result = await resolveGvl('en', {
			cache,
			endpoint: 'https://gvl-wide.test',
			fetch: fetchImpl,
			vendorIds: wide,
		});

		assert.notMatch(urls[0] ?? '', /vendorIds/u);
		assert.deepStrictEqual(Object.keys(result?.vendors ?? {}), ['1']);
		assert.deepStrictEqual(
			Object.keys(
				(
					cache.entries.get(
						gvlCacheKey('https://gvl-wide.test', 'en', wide)
					) as { vendors: Record<string, unknown> }
				).vendors ?? {}
			),
			['1']
		);
	});

	it('passes an unscoped request through unfiltered', async () => {
		const { fetchImpl, urls } = recordUrl(GVL);
		const result = await resolveGvl('en', {
			endpoint: 'https://gvl-unscoped.test',
			fetch: fetchImpl,
			vendorIds: [],
		});

		assert.deepEqual(urls, ['https://gvl-unscoped.test']);
		assert.deepStrictEqual(result?.vendors, {});
	});
});
describe('x-c15t-vendors', () => {
	it('declares the header the device transports send', () => {
		// The mobile lanes write this name on the outgoing request. Pinning it
		// here means a rename fails a test rather than quietly serving every
		// device the whole configured list.
		assert.strictEqual(VENDOR_SCOPE_HEADER, 'x-c15t-vendors');
	});

	it('reads a comma-separated scope and collapses duplicates', () => {
		assert.deepStrictEqual(parseVendorScopeHeader('7, 41,672'), [7, 41, 672]);
		assert.deepStrictEqual(parseVendorScopeHeader(' 7 , 7 ,41 '), [7, 41]);
	});

	it('caps a declared scope at the upstream filter cap', () => {
		// A snapshot of the constant, not the cap's justification: the header
		// and the `?vendorIds=` filter share one number on purpose, and this
		// fails the day they are pulled apart.
		assert.strictEqual(MAX_GVL_QUERY_VENDOR_IDS, 500);

		const atCap = Array.from({ length: 500 }, (_, i) => i + 1);
		assert.deepStrictEqual(parseVendorScopeHeader(atCap.join(',')), atCap);
		assert.strictEqual(
			parseVendorScopeHeader([...atCap, 999_999].join(',')),
			undefined
		);
		// Deduplicated before the cap is counted, so 501 parts naming 500
		// vendors are one scope rather than an oversized one.
		assert.strictEqual(
			parseVendorScopeHeader([...atCap, 1].join(','))?.length,
			500
		);
	});

	it('reads every unusable value as absence', () => {
		// Nothing this header carries may fail `/init`. Each value below has to
		// come out identical to a client that sent no header at all.
		for (const value of [
			'',
			'   ',
			'7,',
			',7',
			'7,,41',
			'seven',
			'7;41',
			'7 41',
			'0',
			'-7',
			'1.5',
			'9007199254740993',
		]) {
			assert.strictEqual(
				parseVendorScopeHeader(value),
				undefined,
				JSON.stringify(value)
			);
		}
		assert.strictEqual(parseVendorScopeHeader(null), undefined);
		assert.strictEqual(parseVendorScopeHeader(undefined), undefined);
	});

	it('narrows a document to the intersection of two scopes', () => {
		// The direction of the merge, asserted rather than implied. The
		// configured scope is [7, 41, 672] and the request declares [672, 999];
		// expected output is ['672'] alone, because 999 is in the upstream
		// document and not in what the publisher configured. Naming an id in a
		// header is not a way to widen a scope.
		assert.deepStrictEqual(
			servedKeys(
				narrowToDeclaredScope(LIST, { vendorIds: CONFIGURED }, [672, 999])
			),
			['672']
		);
		assert.deepStrictEqual(
			servedKeys(
				narrowToDeclaredScope(LIST, { vendorIds: CONFIGURED }, [7, 41])
			),
			['7', '41']
		);
	});

	it('keeps a nil and an empty declared scope identical', () => {
		// Inputs: configured [7, 41, 672] against a document carrying 7, 41,
		// 672 and 999. Expected output for a declared scope of `undefined`, and
		// for a declared scope of `[]`: ['7', '41', '672'] in both cases. They
		// come back identical on purpose. `narrowToVendorIds` reads nil and
		// empty alike as "no filter here" and returns the list untouched for
		// both, so the configured narrowing is the only one that ran. That is
		// also the answer `parseVendorScopeHeader` gives for a header that is
		// absent, empty, or unreadable, which is why an empty declared scope is
		// not a way to be served nothing.
		const configured = { vendorIds: CONFIGURED };
		assert.deepStrictEqual(
			servedKeys(narrowToDeclaredScope(LIST, configured, undefined)),
			['7', '41', '672']
		);
		assert.deepStrictEqual(
			servedKeys(narrowToDeclaredScope(LIST, configured, [])),
			['7', '41', '672']
		);
	});

	it('serves two declared scopes off one fetch', async () => {
		// The no-extra-download promise in one test. Two requests, two
		// different declared scopes, one upstream fetch, and a cache entry that
		// stayed at the configured width, which is what lets the second client
		// be answered without a second round trip.
		const { fetchImpl, urls } = recordUrl(LIST);
		const cache = memoryCache();
		const options = {
			cache,
			endpoint: 'https://gvl-scope-two.test',
			fetch: fetchImpl,
			vendorIds: CONFIGURED,
		};

		const [narrow, wide] = await Promise.all([
			resolveGvl('en', options, [7, 41]),
			resolveGvl('en', options, undefined),
		]);

		assert.deepStrictEqual(servedKeys(narrow), ['7', '41']);
		assert.deepStrictEqual(servedKeys(wide), ['7', '41', '672']);
		assert.strictEqual(urls.length, 1);
		// The scope that travelled upstream is the configured one. A declared
		// scope reaching the URL would mean a second, client-shaped download.
		assert.match(urls[0] ?? '', /vendorIds=7(?:%2C|,)41(?:%2C|,)672$/u);

		const cached = cache.entries.get(
			gvlCacheKey(options.endpoint, 'en', CONFIGURED)
		) as GlobalVendorList;
		assert.deepStrictEqual(Object.keys(cached.vendors), ['7', '41', '672']);
	});

	it('keeps the cost of the header off the cache', async () => {
		// Three declared scopes, one cache entry, keyed by configuration. A key
		// that folded in a declared scope would put three entries here and let
		// any client mint them; `inflight` shares these keys too, so it would
		// fan out the same way.
		const cache = memoryCache();
		const options = {
			cache,
			endpoint: 'https://gvl-scope-key.test',
			fetch: recordUrl(LIST).fetchImpl,
			vendorIds: CONFIGURED,
		};

		await resolveGvl('en', options, [7, 41]);
		await resolveGvl('en', options, undefined);
		await resolveGvl('en', options, [672, 999]);

		assert.deepStrictEqual(
			[...cache.entries.keys()],
			[gvlCacheKey('https://gvl-scope-key.test', 'en', CONFIGURED)]
		);
	});
});
