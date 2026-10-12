// @vitest-environment node
/// <reference types="node" />
/**
 * `init()` from the ES module entries: the mode is a factory, the factories
 * read what the build integration downloaded, and a page bundles only the
 * mode it imports.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { manifest as browserManifest } from '@c15t/core/transports/manifest-browser';
import type { ConsentManifest } from '@c15t/schema/types';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

import { createConsentClient, hosted, manifest } from '../index';
import { hostedWithBuild } from '../transports/hosted';
import { withBuildDefaults } from '../transports/manifest';

const builtManifest: ConsentManifest = {
	branding: 'c15t',
	revision: 'built',
	schemaVersion: 2,
};
const buildOutput = {
	backendURL: 'https://built.example',
	snapshot: builtManifest,
};

describe('init() from @c15t/browser', () => {
	it.each([
		['a mode name', { mode: 'hosted' }],
		['no mode', {}],
	])('throws for %s', (_name, options) => {
		expect(() =>
			createConsentClient(
				options as unknown as Parameters<typeof createConsentClient>[0]
			)
		).toThrow('`mode` must be a factory');
	});

	it('reports the factory kind as the mode', () => {
		const client = createConsentClient({
			mode: hosted({ backendURL: 'https://backend.example' }),
			ui: false,
		});
		expect(client.mode).toBe('hosted');
	});
});

describe('manifest() from @c15t/browser', () => {
	it('uses the snapshot and backend URL the build downloaded', () => {
		expect(withBuildDefaults({}, buildOutput)).toEqual(buildOutput);
	});

	it('lets options win, and fetches at runtime with source: runtime', () => {
		expect(
			withBuildDefaults({ source: 'runtime' }, buildOutput).snapshot
		).toBeUndefined();
		expect(
			withBuildDefaults({ manifestURL: '/api/c15t/manifest' }, buildOutput)
		).toEqual({
			backendURL: 'https://built.example',
			manifestURL: '/api/c15t/manifest',
		});
		expect(
			withBuildDefaults({ backendURL: 'https://own.example' }, buildOutput)
				.backendURL
		).toBe('https://own.example');
	});

	it("saves to the build's backend when manifestURL names a CDN", () => {
		const mode = browserManifest(
			withBuildDefaults(
				{ manifestURL: 'https://cdn.example/policy.json' },
				buildOutput
			)
		);
		expect(mode.backendURL).toBe('https://built.example');
		expect(mode.manifestURL).toBe('https://cdn.example/policy.json');
		expect(mode.snapshot).toBeUndefined();
	});

	it('carries the resolved options as data', () => {
		const mode = manifest({ backendURL: '', snapshot: builtManifest });
		expect(mode.kind).toBe('manifest');
		expect(mode.snapshot).toBe(builtManifest);
	});

	it('needs a source when the build set none', () => {
		expect(() => manifest()).toThrow('needs `snapshot`');
	});
});

describe('hosted() from @c15t/browser', () => {
	it('defaults to the backend URL the build read', () => {
		expect(hostedWithBuild({}, 'https://built.example').backendURL).toBe(
			'https://built.example'
		);
		expect(
			hostedWithBuild({ backendURL: '/api/c15t' }, 'https://built.example')
				.backendURL
		).toBe('/api/c15t');
	});

	it('needs a backend URL when the build set none', () => {
		expect(() => hosted()).toThrow(
			'@c15t/browser: hosted() needs `backendURL`. Pass it, or add consentManifest() from c15t/build to your Vite config and set VITE_C15T_BACKEND_URL (or VITE_INTH_PROJECT_URL).'
		);
	});
});

const SOURCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Bundles an entry for the browser the way an app's bundler would. */
const bundle = async function bundle(contents: string): Promise<string> {
	const result = await build({
		bundle: true,
		format: 'esm',
		logLevel: 'silent',
		platform: 'browser',
		stdin: { contents, loader: 'ts', resolveDir: SOURCE_DIR },
		write: false,
	});
	return result.outputFiles.map((file) => file.text).join('\n');
};

/** A rule id in `recommendedPolicyRules()`, the offline default pack. */
const OFFLINE_POLICY = 'quebec_opt_in';
/** An error the manifest resolver throws (`@c15t/schema`). */
const RESOLVER = 'Unsupported pack field';

describe('first-load JavaScript of @c15t/browser', () => {
	it('bundles neither offline mode nor the resolver for hosted()', async () => {
		const code = await bundle(
			"import { hosted, init } from './index';\ninit({ mode: hosted() });"
		);
		expect(code).not.toContain(OFFLINE_POLICY);
		expect(code).not.toContain(RESOLVER);
	}, 60_000);

	it('bundles the resolver but not offline mode for manifest()', async () => {
		const code = await bundle(
			"import { init, manifest } from './index';\ninit({ mode: manifest() });"
		);
		expect(code).not.toContain(OFFLINE_POLICY);
		expect(code).toContain(RESOLVER);
	}, 60_000);

	it('bundles the offline pack for offline()', async () => {
		const code = await bundle(
			"import { init, offline } from './index';\ninit({ mode: offline() });"
		);
		expect(code).toContain(OFFLINE_POLICY);
	}, 60_000);
});
