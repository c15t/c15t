/**
 * The script-tag routes, exercised through real requests.
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

import { policyRulePresets } from '@c15t/schema/types';
import { Effect, ManagedRuntime } from 'effect';
import type { SqlClient } from 'effect/sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import { up as baseline } from '../db/migrations/1-baseline';
import { c15tInstance } from '../instance';
import { createApp } from './app';
import type { AppOptions } from './context';
import { buildScriptResponse, deriveBackendURL } from './script';
import type { ScriptOptions } from './script';

const [engine] = ENGINES;

if (!engine) {
	throw new Error('no test engine available');
}

const readQueuedConfig = function readQueuedConfig(body: string): unknown {
	const [prelude] = body.split('\n', 1);
	return runInNewContext(`${prelude}\nwindow.c15t[0][1];`, { window: {} });
};

describe('deriveBackendURL', () => {
	it('normalizes long mount paths without rescanning interior slashes', () => {
		const prefix = `/api/${'/'.repeat(100_000)}consent`;
		const start = performance.now();
		const result = deriveBackendURL(
			'https://example.test/c15t.js',
			'/c15t.js',
			`${prefix}///`
		);
		expect(performance.now() - start).toBeLessThan(1_000);
		expect(result).toBe(`https://example.test${prefix}`);
	});

	it('invalidates cached scripts when bundle bytes change without changing length', async () => {
		const request = {
			backendURL: 'https://example.test',
			cache: undefined,
			language: null,
			manifest: { policyRules: [policyRulePresets.europeOptIn()] },
			options: {},
			variant: 'full' as const,
		};
		const first = await buildScriptResponse({
			...request,
			bundle: 'const a=1;',
		});
		const second = await buildScriptResponse({
			...request,
			bundle: 'const a=2;',
		});
		expect(first.etag).not.toBe(second.etag);
	});
	it('strips the route path and keeps a mount prefix', () => {
		expect(deriveBackendURL('https://x.c15t.dev/c15t.js', '/c15t.js')).toBe(
			'https://x.c15t.dev'
		);
		expect(
			deriveBackendURL(
				'https://x.c15t.dev/api/c15t/c15t.js?language=de',
				'/c15t.js'
			)
		).toBe('https://x.c15t.dev/api/c15t');
	});
});

const mountedRoutes: [string, ScriptOptions][] = [
	['/c15t.js', {}],
	['/c15t.headless.js', {}],
	['/c15t.iab.js', {}],
	['/assets/privacy.js', { path: '/assets/privacy.js' }],
	['/assets/runtime.js', { headlessPath: '/assets/runtime.js' }],
	['/assets/advertising.js', { iabPath: '/assets/advertising.js' }],
];

describe('mounted script routes through c15tInstance', () => {
	it.each(mountedRoutes)(
		'preserves the backend mount for %s',
		async (path, script) => {
			const instance = c15tInstance({
				basePath: '/api/c15t',
				database: { dialect: 'sqlite', filename: ':memory:' },
				script,
			});
			try {
				const response = await instance.handler(
					new Request(
						`https://consent.example.test/api/c15t${path}?language=en`
					)
				);
				expect(response.status).toBe(200);
				const [prelude] = (await response.text()).split('\n', 1);
				expect(prelude).toContain(
					'"backendURL":"https://consent.example.test/api/c15t"'
				);
			} finally {
				await instance.dispose();
			}
		}
	);

	it.each([
		['/api/c15t/', '/api/c15t'],
		['/', ''],
		['', ''],
	])('normalizes the configured mount %j', async (basePath, prefix) => {
		const instance = c15tInstance({
			basePath,
			database: { dialect: 'sqlite', filename: ':memory:' },
		});
		try {
			const response = await instance.handler(
				new Request(`https://consent.example.test${prefix}/c15t.js`)
			);
			expect(response.status).toBe(200);
			const [prelude] = (await response.text()).split('\n', 1);
			expect(prelude).toContain(
				`"backendURL":"https://consent.example.test${prefix}"`
			);
		} finally {
			await instance.dispose();
		}
	});

	it.each(['https://api.example.test/consent', ''])(
		'preserves an explicit backend URL %j instead of inferring the mount',
		async (backendURL) => {
			const instance = c15tInstance({
				basePath: '/api/c15t',
				database: { dialect: 'sqlite', filename: ':memory:' },
				script: { backendURL },
			});
			try {
				const response = await instance.handler(
					new Request('https://consent.example.test/api/c15t/c15t.js')
				);
				expect(response.status).toBe(200);
				const [prelude] = (await response.text()).split('\n', 1);
				expect(prelude).toContain(`"backendURL":${JSON.stringify(backendURL)}`);
			} finally {
				await instance.dispose();
			}
		}
	);
});

describe(`GET /c15t.js (${engine.name})`, () => {
	let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;

	const makeApp = function makeApp(options: AppOptions = {}) {
		return createApp(runtime, {
			manifest: {
				policyRules: [
					{ ...policyRulePresets.europeOptIn(), match: { isDefault: true } },
				],
			},
			...options,
		});
	};

	beforeEach(async () => {
		runtime = ManagedRuntime.make(engine.client);
		await runtime.runPromise(
			Effect.gen(function* scriptTestEffect() {
				yield* resetDatabase;
				yield* baseline;
			})
		);
	});

	afterEach(async () => {
		await runtime.dispose();
	});

	it('serves the default hosted bundle with its backend configuration', async () => {
		const response = await makeApp().request('http://x.c15t.dev/c15t.js');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe(
			'text/javascript; charset=utf-8'
		);
		expect(response.headers.get('cache-control')).toContain('s-maxage=');
		// Vercel strips the shared-cache directives from a bare Cache-Control;
		// the same policy in CDN-Cache-Control keeps them visible downstream.
		expect(response.headers.get('cdn-cache-control')).toBe(
			response.headers.get('cache-control')
		);
		expect(response.headers.get('etag')).toMatch(/^".+"$/u);

		const body = await response.text();
		const [prelude] = body.split('\n', 1);
		expect(prelude).toMatch(
			/^\(function\(c\)\{window\.c15t=window\.c15t\|\|\[\];.*\}\)\(\{.*\}\);$/u
		);
		const config = readQueuedConfig(body);
		expect(config).toMatchObject({
			backendURL: 'http://x.c15t.dev',
			mode: 'hosted',
		});
		expect(config).not.toHaveProperty('manifest');
		// The bundle follows and installs the global.
		expect(body).toContain('window.c15t');
		expect(body.length).toBeGreaterThan(prelude?.length ?? 0 + 10_000);
	});

	it('answers 304 to a matching If-None-Match', async () => {
		const app = makeApp();
		const first = await app.request('http://x.c15t.dev/c15t.js');
		const etag = first.headers.get('etag') as string;

		const second = await app.request('http://x.c15t.dev/c15t.js', {
			headers: { 'If-None-Match': etag },
		});

		expect(second.status).toBe(304);
	});

	it('changes the ETag when the baked-in config changes', async () => {
		const first = await makeApp().request('http://x.c15t.dev/c15t.js');
		const second = await makeApp({
			script: { config: { consentCategories: ['marketing'] } },
		}).request('http://x.c15t.dev/c15t.js');

		expect(first.headers.get('etag')).not.toBe(second.headers.get('etag'));
	});

	it('bakes in extra config and lets a fixed backendURL win', async () => {
		const response = await makeApp({
			script: {
				backendURL: 'https://consent.example.com',
				config: { consentCategories: ['measurement'] },
			},
		}).request('http://x.c15t.dev/c15t.js');

		const body = await response.text();
		expect(body).toContain('"backendURL":"https://consent.example.com"');
		expect(body).toContain('"consentCategories":["measurement"]');
	});

	it.each([
		{ language: 'de', query: '?language=de' },
		{ language: 'en', query: '' },
	])(
		'preserves configured overrides with script query $query',
		async ({ query, language }) => {
			const response = await makeApp({
				script: {
					config: {
						overrides: { country: 'US', language: 'en', region: 'CA' },
					},
				},
			}).request(`http://x.c15t.dev/c15t.js${query}`);

			expect(response.status).toBe(200);
			expect(readQueuedConfig(await response.text())).toMatchObject({
				mode: 'hosted',
				overrides: { country: 'US', language, region: 'CA' },
			});
		}
	);

	it('serves the headless build on its own path', async () => {
		const response = await makeApp().request(
			'http://x.c15t.dev/c15t.headless.js'
		);

		expect(response.status).toBe(200);
		const body = await response.text();
		expect(readQueuedConfig(body)).toMatchObject({
			manifest: { policyPacks: [expect.any(Object)] },
			mode: 'manifest',
		});
		expect(body).not.toContain('consent-banner-root');
	});

	it('serves IAB only from its separate route and honors an override', async () => {
		const app = makeApp({
			script: { config: { iab: { cmpId: 28 } }, iabPath: '/privacy.iab.js' },
		});
		const response = await app.request('http://x.c15t.dev/privacy.iab.js');
		expect(response.status).toBe(200);
		const body = await response.text();
		expect(readQueuedConfig(body)).toMatchObject({
			manifest: { policyPacks: [expect.any(Object)] },
			mode: 'manifest',
		});
		expect(body).toContain('iab-consent-banner-root');
		expect(body).toContain('"cmpId":28');
		expect(
			await (await app.request('http://x.c15t.dev/c15t.js')).text()
		).not.toContain('iab-consent-banner-root');
		expect((await app.request('http://x.c15t.dev/c15t.iab.js')).status).toBe(
			404
		);
	});

	it('escapes a closing script tag in the config', async () => {
		const response = await makeApp({
			script: { config: { note: '</script><script>alert(1)' } },
		}).request('http://x.c15t.dev/c15t.js');

		const body = await response.text();
		expect(body).not.toContain('</script>');
		expect(body).toContain('\\u003c/script>');
	});

	it('is not registered when turned off', async () => {
		const response = await makeApp({ script: { enabled: false } }).request(
			'http://x.c15t.dev/c15t.js'
		);

		expect(response.status).toBe(404);
	});

	it('explains a missing bundle instead of failing', async () => {
		const response = await makeApp({
			script: { bundles: { full: '/nowhere/c15t.js' } },
		}).request('http://x.c15t.dev/c15t.js');

		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({
			cause: { code: 'SCRIPT_UNAVAILABLE' },
		});
	});

	describe('early /init', () => {
		// Runs the lines before the bundle in a page with no stored consent
		// and returns the URLs they fetched.
		const runInPage = function runInPage(
			code: string,
			page: { attributes?: string[]; queue?: unknown[] } = {}
		): string[] {
			const fetched: string[] = [];
			const context: Record<string, unknown> = {
				crypto: globalThis.crypto,
				document: {
					cookie: '',
					currentScript: {
						hasAttribute: (name: string) =>
							page.attributes?.includes(name) ?? false,
					},
				},
				fetch: (url: string) => {
					fetched.push(url);
					// Never settles: only the request matters here.
					return Promise.withResolvers().promise;
				},
				localStorage: { getItem: () => null },
				location: { origin: 'https://site.example' },
				navigator: {},
				sessionStorage: { getItem: () => null },
			};
			context.window = context;
			context.c15t = page.queue;
			runInNewContext(code, context);
			return fetched;
		};
		// The config line and the early init line, without the bundle.
		const runPrelude = (body: string, page?: Parameters<typeof runInPage>[1]) =>
			runInPage(body.split('\n', 2).join('\n'), page);

		it('starts /init before the bundle runs', async () => {
			const body = await (
				await makeApp().request('http://x.c15t.dev/c15t.js?language=de')
			).text();

			const [url] = runPrelude(body);
			expect(new URL(url as string).pathname).toBe('/init');
			expect(url).toMatch(/^http:\/\/x\.c15t\.dev\/init\?v=/u);
			// The baked-in config still comes first and is unchanged.
			expect(readQueuedConfig(body)).toMatchObject({
				overrides: { language: 'de' },
			});
		});

		it('leaves /init to the runtime when the page could change it', async () => {
			const body = await (
				await makeApp().request('http://x.c15t.dev/c15t.js')
			).text();

			expect(runPrelude(body, { attributes: ['data-language'] })).toEqual([]);
			expect(
				runPrelude(body, {
					queue: [['config', { overrides: { country: 'FR' } }]],
				})
			).toEqual([]);
			// Options that don't touch the request keep the early start.
			expect(
				runPrelude(body, {
					queue: [['config', { consentCategories: ['marketing'] }]],
				})
			).toHaveLength(1);
		});

		it('serves the same request on /c15t.init.js for an async tag', async () => {
			const app = makeApp();
			const full = await (
				await app.request('http://x.c15t.dev/c15t.js?language=de')
			).text();
			const response = await app.request(
				'http://x.c15t.dev/c15t.init.js?language=de'
			);

			expect(response.status).toBe(200);
			expect(response.headers.get('cache-control')).toContain('s-maxage=');
			const init = await response.text();
			// It runs before the c15t tag, so no queue or tag exists yet. Each
			// run draws a new journey id, so compare the rest of the request.
			const withoutJourney = (urls: string[]) =>
				urls.map((url) => {
					const parsed = new URL(url);
					parsed.searchParams.delete('journey');
					return parsed.href;
				});
			expect(withoutJourney(runInPage(init, { queue: undefined }))).toEqual(
				withoutJourney(runPrelude(full))
			);
			expect(full.split('\n', 2)[1]).toContain(init.trim());
		});

		it('explains a turned-off /c15t.init.js', async () => {
			const response = await makeApp({ script: { prefetch: false } }).request(
				'http://x.c15t.dev/c15t.init.js'
			);

			expect(response.status).toBe(503);
		});

		const bundlePath = createRequire(import.meta.url).resolve(
			'@c15t/browser/c15t.js'
		);

		it.each<[string, string, ScriptOptions]>([
			['when turned off', '/c15t.js', { prefetch: false }],
			['for a custom bundle', '/c15t.js', { bundles: { full: bundlePath } }],
			['to the headless build', '/c15t.headless.js', {}],
			[
				'for an experiment the builder rejects',
				'/c15t.js',
				{ config: { experiment: 'ab' } },
			],
		])('is not added %s', async (_name, path, script) => {
			const body = await (
				await makeApp({ script }).request(`http://x.c15t.dev${path}`)
			).text();
			const bundle = await readFile(
				createRequire(import.meta.url).resolve(`@c15t/browser${path}`),
				'utf8'
			);

			// Only the config line comes before the bundle.
			expect(body.slice(body.indexOf('\n') + 1)).toBe(bundle);
		});
	});
});
