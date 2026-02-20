import { describe, expect, it } from 'vitest';
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
		expect(body).toContain(
			"window.dispatchEvent(new Event('c15t:embed:payload'))"
		);
		expect(body).toContain('window.c15tEmbed?.bootstrap?.()');
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
});
