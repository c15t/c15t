/**
 * Runtime overrides of what the build fixed: `mode.type`, `mode.resolve`
 * and `routePrefix`, through `NUXT_PUBLIC_C15T_MODE_TYPE`,
 * `NUXT_PUBLIC_C15T_MODE_RESOLVE` and `NUXT_PUBLIC_C15T_ROUTE_PREFIX`.
 * Nitro applies them to each request's runtime config, which the server
 * render reads and sends to the browser. Other mode fields, such as
 * `manifestURL`, the server reads at runtime, so their overrides stay.
 */
import { describe, expect, test } from 'vitest';

import {
	buildOptionVariable,
	createBuildOptionsGuard,
	findOverriddenOptions,
	pinBuildOptions,
} from '../runtime/server/build-options';
import type {
	BuiltOptionName,
	BuiltOptions,
} from '../runtime/server/build-options';

const BUILT: BuiltOptions = {
	mode: {
		manifestURL: 'http://localhost:3000/api/bench-consent/manifest',
		resolve: 'browser',
		type: 'manifest',
	},
	routePrefix: '/api/c15t',
};

/** A request's runtime config after Nitro applied the variables. */
const overridden = (
	c15t: { mode?: Record<string, unknown>; routePrefix?: unknown } = {}
) => ({
	public: {
		c15t: {
			backendURL: 'https://consent.example.com',
			mode: { ...BUILT.mode, ...c15t.mode },
			routePrefix: 'routePrefix' in c15t ? c15t.routePrefix : BUILT.routePrefix,
		},
	},
});

describe('pinBuildOptions', () => {
	test.each([
		['routePrefix', { routePrefix: '/' }],
		['routePrefix', { routePrefix: false }],
		['mode.type', { mode: { type: 'hosted' } }],
		['mode.resolve', { mode: { resolve: 'server' } }],
		['all three', { mode: { type: 'offline' }, routePrefix: '/elsewhere' }],
	])('gives the browser the built %s', (_name, override) => {
		const runtimeConfig = overridden(override);
		pinBuildOptions(runtimeConfig, BUILT);
		expect(runtimeConfig.public.c15t).toEqual({
			backendURL: 'https://consent.example.com',
			...BUILT,
		});
	});

	test('keeps the mode fields the server reads at runtime', () => {
		const runtimeConfig = overridden({
			mode: {
				backendURL: 'https://runtime.example.com',
				manifestURL: 'http://localhost:4100/manifest?cold=1',
				type: 'hosted',
			},
		});
		pinBuildOptions(runtimeConfig, BUILT);
		expect(runtimeConfig.public.c15t.mode).toEqual({
			backendURL: 'https://runtime.example.com',
			manifestURL: 'http://localhost:4100/manifest?cold=1',
			resolve: 'browser',
			type: 'manifest',
		});
	});

	test('removes a resolve the build did not set', () => {
		const runtimeConfig = overridden({ mode: { resolve: 'browser' } });
		pinBuildOptions(runtimeConfig, {
			mode: { type: 'manifest' },
			routePrefix: '/api/c15t',
		});
		expect(runtimeConfig.public.c15t.mode).not.toHaveProperty('resolve');
	});

	test('leaves a config without the c15t key alone', () => {
		const runtimeConfig = { public: {} };
		pinBuildOptions(runtimeConfig, BUILT);
		expect(runtimeConfig).toEqual({ public: {} });
	});
});

describe('findOverriddenOptions', () => {
	test('names each fixed option that differs from the build', () => {
		expect(
			findOverriddenOptions(overridden({ routePrefix: '/' }).public.c15t, BUILT)
		).toEqual(['routePrefix']);
		expect(
			findOverriddenOptions(
				overridden({ mode: { type: 'hosted' } }).public.c15t,
				BUILT
			)
		).toEqual(['type']);
		expect(
			findOverriddenOptions(
				overridden({ mode: { resolve: 'server' }, routePrefix: '/' }).public
					.c15t,
				BUILT
			)
		).toEqual(['resolve', 'routePrefix']);
	});

	test('ignores the mode fields the server reads at runtime', () => {
		expect(
			findOverriddenOptions(
				overridden({
					mode: {
						backendURL: 'https://runtime.example.com',
						manifestURL: 'http://localhost:4100/manifest',
						source: 'runtime',
					},
				}).public.c15t,
				BUILT
			)
		).toEqual([]);
	});

	test('treats a resolve both leave out as equal', () => {
		expect(
			findOverriddenOptions(
				{ mode: { type: 'manifest' }, routePrefix: '/api/c15t' },
				{ mode: { type: 'manifest' }, routePrefix: '/api/c15t' }
			)
		).toEqual([]);
		expect(findOverriddenOptions(undefined, BUILT)).toEqual([]);
	});
});

describe('createBuildOptionsGuard', () => {
	test('keeps a runtime manifestURL, with no warning', () => {
		const warned: BuiltOptionName[] = [];
		const guard = createBuildOptionsGuard(BUILT, (name) => warned.push(name));
		const runtimeConfig = overridden({
			mode: { manifestURL: 'http://localhost:4100/manifest?cold=1' },
		});
		guard(runtimeConfig);
		expect(runtimeConfig.public.c15t.mode).toHaveProperty(
			'manifestURL',
			'http://localhost:4100/manifest?cold=1'
		);
		expect(warned).toEqual([]);
	});

	test('pins an override that first appears on a later request, warning once', () => {
		// Cloudflare applies bindings per request: the first request matches
		// the build, and a later one carries the override.
		const warned: BuiltOptionName[] = [];
		const guard = createBuildOptionsGuard(BUILT, (name) => warned.push(name));
		const first = overridden();
		guard(first);
		expect(first.public.c15t.routePrefix).toBe('/api/c15t');
		expect(warned).toEqual([]);
		for (let request = 0; request < 2; request += 1) {
			const later = overridden({ mode: { type: 'hosted' }, routePrefix: '/' });
			guard(later);
			expect(later.public.c15t).toMatchObject(BUILT);
		}
		expect(warned.map(buildOptionVariable)).toEqual([
			'NUXT_PUBLIC_C15T_MODE_TYPE',
			'NUXT_PUBLIC_C15T_ROUTE_PREFIX',
		]);
	});
});

describe('buildOptionVariable', () => {
	test('names the leaf variable a deployment sets', () => {
		expect(buildOptionVariable('type')).toBe('NUXT_PUBLIC_C15T_MODE_TYPE');
		expect(buildOptionVariable('resolve')).toBe(
			'NUXT_PUBLIC_C15T_MODE_RESOLVE'
		);
		expect(buildOptionVariable('routePrefix')).toBe(
			'NUXT_PUBLIC_C15T_ROUTE_PREFIX'
		);
	});
});
