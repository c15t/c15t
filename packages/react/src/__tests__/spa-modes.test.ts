/**
 * `manifest()` and `hosted()` from `c15t/react` default to what the build
 * integration downloaded, served as `@c15t/core/generated`. Without a build
 * integration that module exports `undefined`, so they need their source
 * passed in.
 */
import { manifest as browserManifest } from '@c15t/core/transports/manifest-browser';
import type { ConsentManifest } from '@c15t/schema/types';
import { describe, expect, test } from 'vitest';

import { hosted, manifest } from '../modes';
import { hostedWithBuild } from '../transports/hosted';
import { withBuildDefaults } from '../transports/manifest';

const built: ConsentManifest = {
	branding: 'c15t',
	revision: 'built',
	schemaVersion: 2,
};
const build = { backendURL: 'https://built.example', snapshot: built };

describe('manifest() from c15t/react', () => {
	test('uses the snapshot and backend URL the build downloaded', () => {
		expect(withBuildDefaults({}, build)).toEqual({
			backendURL: 'https://built.example',
			snapshot: built,
		});
	});

	test('lets options win', () => {
		const own: ConsentManifest = { ...built, revision: 'own' };

		expect(withBuildDefaults({ snapshot: own }, build).snapshot).toBe(own);
		expect(
			withBuildDefaults({ source: 'runtime' }, build).snapshot
		).toBeUndefined();
		expect(withBuildDefaults({ manifestURL: '/c15t/manifest' }, build)).toEqual(
			{ backendURL: 'https://built.example', manifestURL: '/c15t/manifest' }
		);
		expect(
			withBuildDefaults({ backendURL: '/api/c15t' }, build).backendURL
		).toBe('/api/c15t');
	});

	test("saves to the build's backend when manifestURL names a CDN", () => {
		const mode = browserManifest(
			withBuildDefaults(
				{ manifestURL: 'https://cdn.example/policy.json' },
				build
			)
		);

		expect(mode.backendURL).toBe('https://built.example');
		expect(mode.manifestURL).toBe('https://cdn.example/policy.json');
		expect(mode.snapshot).toBeUndefined();
	});

	test('carries the resolved options as data', () => {
		const mode = manifest({ backendURL: '/api/c15t', snapshot: built });

		expect(mode.kind).toBe('manifest');
		expect(mode.snapshot).toBe(built);
		expect(mode.backendURL).toBe('/api/c15t');
	});

	test('needs a source when the build set none', () => {
		expect(() => manifest()).toThrow('needs `snapshot`');
	});
});

describe('hosted() from c15t/react', () => {
	test('defaults to the backend URL the build read', () => {
		expect(hostedWithBuild({}, 'https://built.example').backendURL).toBe(
			'https://built.example'
		);
		expect(
			hostedWithBuild({ backendURL: '/api/c15t' }, 'https://built.example')
				.backendURL
		).toBe('/api/c15t');
	});

	test('needs a backend URL when the build set none', () => {
		expect(() => hosted()).toThrow(
			'c15t: hosted() needs `backendURL`. Pass it, or add consentManifest() from c15t/build to your Vite config and set VITE_C15T_BACKEND_URL (or VITE_INTH_PROJECT_URL).'
		);
		expect(hosted({ backendURL: '/api/c15t' }).kind).toBe('hosted');
	});
});
