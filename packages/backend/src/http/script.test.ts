/**
 * The script-tag routes, exercised through real requests.
 */
import { policyRulePresets } from '@c15t/schema/types';
import { Effect, ManagedRuntime } from 'effect';
import type { SqlClient } from 'effect/unstable/sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import { up as baseline } from '../db/migrations/1-baseline';
import { createApp } from './app';
import type { AppOptions } from './context';
import { buildScriptResponse, deriveBackendURL } from './script';

const [engine] = ENGINES;

if (!engine) {
	throw new Error('no test engine available');
}

describe('deriveBackendURL', () => {
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

	it('serves the bundle behind a manifest prelude', async () => {
		const response = await makeApp().request('http://x.c15t.dev/c15t.js');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe(
			'text/javascript; charset=utf-8'
		);
		expect(response.headers.get('cache-control')).toContain('s-maxage=');
		expect(response.headers.get('etag')).toMatch(/^".+"$/u);

		const body = await response.text();
		const [prelude] = body.split('\n', 1);
		expect(prelude).toMatch(
			/^\(function\(c\)\{window\.c15t=window\.c15t\|\|\[\];.*\}\)\(\{.*\}\);$/u
		);
		const config = JSON.parse(
			(prelude as string).slice(
				(prelude as string).indexOf('})(') + '})('.length,
				-');'.length
			)
		) as {
			mode: string;
			backendURL: string;
			manifest: { policyPacks: unknown[] };
		};
		expect(config.mode).toBe('manifest');
		expect(config.backendURL).toBe('http://x.c15t.dev');
		expect(config.manifest.policyPacks).toHaveLength(1);
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

	it('serves the headless build on its own path', async () => {
		const response = await makeApp().request(
			'http://x.c15t.dev/c15t.headless.js'
		);

		expect(response.status).toBe(200);
		const body = await response.text();
		expect(body).toContain('"mode":"manifest"');
		expect(body).not.toContain('consent-banner-root');
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
});
