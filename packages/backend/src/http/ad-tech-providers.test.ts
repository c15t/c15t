/**
 * Google Additional Consent providers travel on `/init` the way the vendor
 * list does: resolved server-side, cached, and served only to a request that
 * matched an IAB policy.
 */

import {
	AD_TECH_PROVIDER_FETCH_TIMEOUT_MS,
	policyRulePresets,
} from '@c15t/schema/types';
import type { ConsentManifestConfig } from '@c15t/schema/types';
import { afterEach, assert, describe, expect, it, vi } from 'vitest';

import {
	resetAdTechProviderState,
	resolveAdTechProviders,
} from './ad-tech-providers';
import type { CacheAdapter } from './gvl';
import { buildInitResponse } from './init';

const LIST = {
	providers: {
		'2572': {
			id: 2572,
			name: 'Snap Inc.',
			policyUrl: 'https://www.snap.com/en-US/privacy/privacy-policy/',
		},
		'89': {
			id: 89,
			name: 'Meta',
			policyUrl: 'https://www.facebook.com/about/privacy/update',
		},
		'999': { id: 999, name: 'Unconfigured', policyUrl: 'https://x.example' },
		broken: {
			id: 5,
			name: 'No policy',
			policyUrl: 'ftp://files.example/privacy',
		},
	},
};

/** Records the URLs it was asked for, answering with `body` and `status`. */
const listServer = (body: unknown = LIST, status = 200) => {
	const urls: string[] = [];
	const fetch = ((input: RequestInfo | URL) => {
		urls.push(String(input));
		return Promise.resolve(new Response(JSON.stringify(body), { status }));
	}) as unknown as typeof globalThis.fetch;
	return { fetch, urls };
};

const memoryCache = (): CacheAdapter & { store: Map<string, unknown> } => {
	const store = new Map<string, unknown>();
	return {
		delete: (key: string) => {
			store.delete(key);
			return Promise.resolve();
		},
		get: <Value>(key: string) =>
			Promise.resolve((store.get(key) as Value | undefined) ?? null),
		set: (key: string, value: unknown) => {
			store.set(key, value);
			return Promise.resolve();
		},
		store,
	} as CacheAdapter & { store: Map<string, unknown> };
};

afterEach(() => {
	vi.restoreAllMocks();
	resetAdTechProviderState();
});

describe('resolveAdTechProviders', () => {
	it('keeps configured providers Google lists, sorted by ID', async () => {
		const { fetch, urls } = listServer();
		const providers = await resolveAdTechProviders({
			fetch,
			providers: [2572, 89, 5, 404],
			url: 'https://lists.example/ac',
		});
		assert.deepStrictEqual(
			providers?.map(({ id }) => id),
			[89, 2572]
		);
		assert.strictEqual(
			urls[0],
			'https://lists.example/ac?providerIds=5%2C89%2C404%2C2572'
		);
	});

	it('answers a cold cache with one fetch and reuses it', async () => {
		const { fetch, urls } = listServer();
		const cache = memoryCache();
		const options = {
			cache,
			fetch,
			providers: [89, 2572],
			url: 'https://lists.example/ac-cache',
		};
		await Promise.all([
			resolveAdTechProviders(options),
			resolveAdTechProviders(options),
		]);
		await resolveAdTechProviders(options);
		assert.strictEqual(urls.length, 1);
		assert.deepStrictEqual(
			[...cache.store.keys()],
			[
				'ac:https://lists.example/ac-cache|89,2572',
				'ac:https://lists.example/ac-cache|89,2572|stale',
			]
		);
	});

	it('returns null without caching when the list is unavailable', async () => {
		const cache = memoryCache();
		const { fetch } = listServer({ error: 'down' }, 503);
		const url = 'https://lists.example/ac-down';
		assert.isNull(
			await resolveAdTechProviders({ cache, fetch, providers: [89], url })
		);
		resetAdTechProviderState();
		assert.isNull(
			await resolveAdTechProviders({
				cache,
				fetch: listServer({ unexpected: true }).fetch,
				providers: [89],
				url,
			})
		);
		assert.strictEqual(cache.store.size, 0);
	});

	it('loads the list past a cache that throws, and serves it', async () => {
		const { fetch, urls } = listServer();
		const broken: CacheAdapter = {
			delete: () => Promise.reject(new Error('cache down')),
			get: () => Promise.reject(new Error('cache down')),
			set: () => Promise.reject(new Error('cache down')),
		};
		const providers = await resolveAdTechProviders({
			cache: broken,
			fetch,
			providers: [89],
			url: 'https://lists.example/ac-broken-cache',
		});
		assert.deepStrictEqual(providers, [LIST.providers['89']]);
		assert.strictEqual(urls.length, 1);
	});

	it('serves the last list fetched when a refresh fails', async () => {
		const url = 'https://lists.example/ac-refresh';
		await resolveAdTechProviders({
			fetch: listServer().fetch,
			providers: [89],
			url,
		});

		const providers = await resolveAdTechProviders({
			fetch: listServer({ error: 'down' }, 503).fetch,
			providers: [89],
			url,
		});

		assert.deepStrictEqual(providers, [LIST.providers['89']]);
	});

	it('serves the stale cache entry after a restart once the fresh one expires', async () => {
		const cache = memoryCache();
		const url = 'https://lists.example/ac-restart';
		await resolveAdTechProviders({
			cache,
			fetch: listServer().fetch,
			providers: [89],
			url,
		});
		cache.store.delete(`ac:${url}|89`);
		resetAdTechProviderState();

		const providers = await resolveAdTechProviders({
			cache,
			fetch: listServer({ error: 'down' }, 503).fetch,
			providers: [89],
			url,
		});

		assert.deepStrictEqual(providers, [LIST.providers['89']]);
	});

	it('waits a minute after a failed fetch before trying the upstream again', async () => {
		const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
		const { fetch, urls } = listServer({ error: 'down' }, 503);
		const options = {
			fetch,
			providers: [89],
			url: 'https://lists.example/ac-backoff',
		};

		await resolveAdTechProviders(options);
		await resolveAdTechProviders(options);
		assert.strictEqual(urls.length, 1);

		now.mockReturnValue(1_000_000 + 60_001);
		await resolveAdTechProviders(options);
		assert.strictEqual(urls.length, 2);
	});

	it('gives up on a stalled list instead of holding /init open', async () => {
		const deadline = new AbortController();
		const timeout = vi
			.spyOn(AbortSignal, 'timeout')
			.mockReturnValue(deadline.signal);
		const stalled = ((_input: RequestInfo | URL, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () =>
					reject(init.signal?.reason)
				);
			})) as typeof globalThis.fetch;
		const cache = memoryCache();
		const pending = resolveAdTechProviders({
			cache,
			fetch: stalled,
			providers: [89],
			url: 'https://lists.example/ac-stalled',
		});
		await vi.waitFor(() =>
			expect(timeout).toHaveBeenCalledWith(AD_TECH_PROVIDER_FETCH_TIMEOUT_MS)
		);
		deadline.abort(
			new DOMException('The operation timed out.', 'TimeoutError')
		);
		assert.isNull(await pending);
		assert.strictEqual(cache.store.size, 0);
	});
});

const manifest: ConsentManifestConfig = {
	appName: 'c15t-self-host',
	iab: {
		additionalConsent: {
			endpoint: 'https://lists.example/ac-init',
			providers: [89, 2572],
		},
		cmpId: 53,
		enabled: true,
	},
	policyRules: [
		policyRulePresets.californiaOptOut(),
		policyRulePresets.europeIab(),
	],
};

const berlin = () =>
	new Headers({ 'accept-language': 'de-DE', 'x-c15t-country': 'DE' });

describe('/init serves Additional Consent providers with the vendor list', () => {
	it('embeds the providers the manifest lists for a matched IAB rule', async () => {
		const { fetch, urls } = listServer();
		const { body } = await buildInitResponse(
			manifest,
			berlin(),
			undefined,
			undefined,
			undefined,
			{ fetch }
		);
		assert.deepStrictEqual(body.adTechProviders, [
			LIST.providers['89'],
			LIST.providers['2572'],
		]);
		assert.strictEqual(
			urls[0],
			'https://lists.example/ac-init?providerIds=89%2C2572'
		);
	});

	it('shares the vendor list cache under its own key', async () => {
		const store = new Map<string, unknown>();
		const cache: CacheAdapter = {
			delete: () => Promise.resolve(),
			get: <Value>(key: string) =>
				Promise.resolve((store.get(key) as Value | undefined) ?? null),
			set: (key: string, value: unknown) => {
				store.set(key, value);
				return Promise.resolve();
			},
		};
		const { fetch } = listServer();
		await buildInitResponse(
			manifest,
			berlin(),
			undefined,
			{ cache, enabled: false },
			undefined,
			{ fetch }
		);
		assert.deepStrictEqual(
			[...store.keys()],
			[
				'ac:https://lists.example/ac-init|89,2572',
				'ac:https://lists.example/ac-init|89,2572|stale',
			]
		);
	});

	it('serves none to a location the IAB rule does not govern', async () => {
		const { fetch, urls } = listServer();
		const { body } = await buildInitResponse(
			manifest,
			new Headers({ 'x-c15t-country': 'US', 'x-c15t-region': 'CA' }),
			undefined,
			undefined,
			undefined,
			{ fetch }
		);
		assert.isUndefined(body.adTechProviders);
		assert.strictEqual(urls.length, 0);
	});

	it('leaves the field out when refused or unavailable', async () => {
		const refused = listServer();
		const { body: off } = await buildInitResponse(
			manifest,
			berlin(),
			undefined,
			undefined,
			undefined,
			{ enabled: false, fetch: refused.fetch }
		);
		assert.isUndefined(off.adTechProviders);
		assert.strictEqual(refused.urls.length, 0);

		const { body: down } = await buildInitResponse(
			manifest,
			berlin(),
			undefined,
			undefined,
			undefined,
			{ fetch: listServer({}, 500).fetch }
		);
		assert.isUndefined(down.adTechProviders);
		assert.strictEqual(
			(down.policyResolution as { status?: string }).status,
			'matched'
		);
	});
});
