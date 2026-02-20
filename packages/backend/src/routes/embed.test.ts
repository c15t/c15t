import { describe, expect, it } from 'vitest';
import { clearMemoryCache } from '~/cache';
import type { CacheAdapter } from '~/cache/types';
import type { C15TOptions } from '~/types';
import { createEmbedRoute } from './embed';

describe('createEmbedRoute', () => {
	it('returns 404 when embed is disabled', async () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				embed: {
					enabled: false,
				},
			},
		};

		const app = createEmbedRoute(options);
		const response = await app.request('http://localhost/');

		expect(response.status).toBe(404);
	});

	it('returns bootstrap javascript payload when embed is enabled', async () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				disableGeoLocation: true,
				embed: {
					enabled: true,
					options: {
						store: {
							namespace: 'c15tStore',
							storageKey: 'c15t-embed-demo',
						},
						overrides: {
							country: 'GB',
							region: 'ENG',
							language: 'en-GB',
							gpc: false,
						},
						ui: {
							noStyle: true,
							scrollLock: true,
						},
						theme: {
							slots: {
								bannerCard: {
									className: 'site-a-banner',
								},
							},
						},
					},
					revision: 'site-a@v1',
				},
			},
		};

		const app = createEmbedRoute(options);
		const response = await app.request('http://localhost/', {
			headers: {
				'accept-language': 'en-US,en;q=0.9',
			},
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain(
			'application/javascript'
		);

		const body = await response.text();
		expect(body).toContain('window.__c15tEmbedPayload');
		expect(body).toContain('"noStyle":true');
		expect(body).toContain('"scrollLock":true');
		expect(body).toContain('"namespace":"c15tStore"');
		expect(body).toContain('"storageKey":"c15t-embed-demo"');
		expect(body).toContain('"country":"GB"');
		expect(body).toContain('"region":"ENG"');
		expect(body).toContain('"language":"en-GB"');
		expect(body).toContain('"gpc":false');
		expect(body).toContain('"className":"site-a-banner"');
		expect(body).toContain('"revision":"site-a@v1"');
		expect(body).toContain('"jurisdiction":"GDPR"');
		expect(body).toContain('"componentHints":{"preload":[]}');
		expect(body).not.toContain('"iabBanner"');
		expect(body).not.toContain('"iabDialog"');
		expect(body).toContain('c15t-embed.runtime.iife.js');
		expect(body).not.toContain('c15t-embed.runtime-full.iife.js');
		expect(body).toContain('runtimeVariant = "base"');
		expect(body).toContain(
			"window.dispatchEvent(new Event('c15t:embed:payload'))"
		);
		expect(body).toContain(
			'window.c15tEmbedBundle?.initializeEmbedRuntime?.()'
		);
		expect(body).toContain('ensureRuntimeLoaded()');
	});

	it('escapes unsafe characters in serialized payload', async () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				disableGeoLocation: true,
				embed: {
					enabled: true,
					options: {
						theme: {
							slots: {
								bannerCard: {
									className: '</script><script>alert(1)</script>',
								},
							},
						},
					},
				},
			},
		};

		const app = createEmbedRoute(options);
		const response = await app.request('http://localhost/');
		const body = await response.text();

		expect(body).toContain('\\u003c/script\\u003e\\u003cscript\\u003ealert(1)');
		expect(body).not.toContain('</script><script>');
	});

	it('applies query string overrides for country, region, and language', async () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				embed: {
					enabled: true,
				},
			},
		};

		const app = createEmbedRoute(options);
		const response = await app.request(
			'http://localhost/?country=GB&region=ENG&language=fr-FR,fr;q=0.9'
		);
		const body = await response.text();

		expect(response.status).toBe(200);
		expect(body).toContain('"countryCode":"GB"');
		expect(body).toContain('"regionCode":"ENG"');
		expect(body).toContain('"language":"fr"');
	});

	it('includes IAB component hints when IAB is enabled for UK/EEA jurisdictions', async () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				embed: {
					enabled: true,
				},
				iab: {
					enabled: true,
					bundled: {
						en: {} as never,
					},
				},
			},
		};

		const app = createEmbedRoute(options);
		const response = await app.request('http://localhost/?country=GB');
		const body = await response.text();

		expect(response.status).toBe(200);
		expect(body).toContain('"jurisdiction":"UK_GDPR"');
		expect(body).toContain(
			'"componentHints":{"preload":["iabBanner","iabDialog"]}'
		);
		expect(body).toContain('c15t-embed.runtime-full.iife.js');
		expect(body).toContain('runtimeVariant = "full"');
	});

	it('removes IAB component hints outside UK/EEA even when IAB is enabled', async () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				embed: {
					enabled: true,
					options: {
						componentHints: {
							preload: ['banner', 'iabBanner', 'iabDialog', 'dialog'],
						},
					},
				},
				iab: {
					enabled: true,
					bundled: {
						en: {} as never,
					},
				},
			},
		};

		const app = createEmbedRoute(options);
		const response = await app.request(
			'http://localhost/?country=US&region=TX'
		);
		const body = await response.text();

		expect(response.status).toBe(200);
		expect(body).toContain('"jurisdiction":"NONE"');
		expect(body).toContain('"componentHints":{"preload":["banner","dialog"]}');
		expect(body).not.toContain('"iabBanner"');
		expect(body).not.toContain('"iabDialog"');
		expect(body).toContain('c15t-embed.runtime.iife.js');
		expect(body).not.toContain('c15t-embed.runtime-full.iife.js');
		expect(body).toContain('runtimeVariant = "base"');
	});

	it('serves repeat requests from memory cache without cache response headers', async () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				disableGeoLocation: true,
				embed: {
					enabled: true,
				},
			},
		};

		const app = createEmbedRoute(options);
		const firstResponse = await app.request('http://localhost/');
		const firstBody = await firstResponse.text();

		expect(firstResponse.status).toBe(200);
		expect(firstResponse.headers.get('cache-control')).toBeNull();
		expect(firstResponse.headers.get('vary')).toBeNull();
		expect(firstResponse.headers.get('etag')).toBeNull();
		expect(firstResponse.headers.get('x-c15t-embed-cache-key')).toBeNull();
		expect(firstResponse.headers.get('x-c15t-embed-cache-status')).toBeNull();
		expect(
			firstResponse.headers.get('x-c15t-embed-runtime-variant')
		).toBeNull();

		const secondResponse = await app.request('http://localhost/');
		const secondBody = await secondResponse.text();

		expect(secondResponse.status).toBe(200);
		expect(secondBody).toBe(firstBody);
	});

	it('ignores if-none-match and always returns the embed payload body', async () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				disableGeoLocation: true,
				embed: {
					enabled: true,
				},
			},
		};

		const app = createEmbedRoute(options);
		const first = await app.request('http://localhost/');
		const firstBody = await first.text();

		const notModified = await app.request('http://localhost/', {
			headers: {
				'if-none-match': '"any-value"',
			},
		});
		const secondBody = await notModified.text();

		expect(notModified.status).toBe(200);
		expect(secondBody).toBe(firstBody);
	});

	it('returns the correct runtime variant for different geo targets', async () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				embed: {
					enabled: true,
				},
				iab: {
					enabled: true,
					bundled: {
						en: {} as never,
					},
				},
			},
		};

		const app = createEmbedRoute(options);

		const usResponse = await app.request(
			'http://localhost/?country=US&region=TX'
		);
		const gbResponse = await app.request('http://localhost/?country=GB');
		const usBody = await usResponse.text();
		const gbBody = await gbResponse.text();

		expect(usResponse.status).toBe(200);
		expect(gbResponse.status).toBe(200);
		expect(usBody).toContain('runtimeVariant = "base"');
		expect(gbBody).toContain('runtimeVariant = "full"');
	});

	it('hydrates memory cache from external cache adapter when available', async () => {
		clearMemoryCache();

		const store = new Map<string, unknown>();
		let externalGetCount = 0;
		let externalSetCount = 0;
		const externalCache: CacheAdapter = {
			async get<T>(key: string): Promise<T | null> {
				externalGetCount += 1;
				return (store.get(key) as T | undefined) ?? null;
			},
			async set<T>(key: string, value: T): Promise<void> {
				externalSetCount += 1;
				store.set(key, value);
			},
			async delete(key: string): Promise<void> {
				store.delete(key);
			},
			async has(key: string): Promise<boolean> {
				return store.has(key);
			},
		};

		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				disableGeoLocation: true,
				cache: {
					adapter: externalCache,
				},
				embed: {
					enabled: true,
					revision: 'external-cache-test',
				},
			},
		};

		const app = createEmbedRoute(options);

		const first = await app.request('http://localhost/');
		expect(first.status).toBe(200);
		expect(externalGetCount).toBe(1);
		expect(externalSetCount).toBe(1);

		const second = await app.request('http://localhost/');
		expect(second.status).toBe(200);
		expect(externalGetCount).toBe(1);
		expect(externalSetCount).toBe(1);

		// Clear shared memory cache to force the next route instance to read external cache.
		clearMemoryCache();

		// New route instance should hydrate memory from external cache.
		const appWithFreshMemoryCache = createEmbedRoute(options);
		const third = await appWithFreshMemoryCache.request('http://localhost/');
		expect(third.status).toBe(200);
		expect(externalGetCount).toBe(2);
		expect(externalSetCount).toBe(1);
	});
});
