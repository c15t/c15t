/**
 * Runtime overrides of the options the build decided, such as
 * `NUXT_PUBLIC_C15T_ROUTE_PREFIX` or `NUXT_PUBLIC_C15T_MODE_TYPE`. Nitro
 * applies them to each request's runtime config, which the server render
 * reads and sends to the browser.
 */
import { describe, expect, test } from 'vitest';

import {
	createBuildOptionsGuard,
	findOverriddenOptions,
	pinBuildOptions,
} from '../runtime/server/build-options';
import type { BuiltOptions } from '../runtime/server/build-options';

const BUILT: BuiltOptions = {
	mode: { resolve: 'browser', type: 'manifest' },
	routePrefix: '/api/c15t',
};

/** A request's runtime config after Nitro applied the variables. */
const overridden = (c15t: Record<string, unknown>) => ({
	public: {
		c15t: {
			backendURL: 'https://consent.example.com',
			...BUILT,
			...c15t,
		},
	},
});

describe('pinBuildOptions', () => {
	test.each([
		['routePrefix', { routePrefix: '/' }],
		['routePrefix', { routePrefix: false }],
		['mode', { mode: { type: 'hosted' } }],
		['mode', { mode: { resolve: 'browser', type: 'offline' } }],
		['both', { mode: { type: 'hosted' }, routePrefix: '/elsewhere' }],
	])('gives the browser the built options over %s', (_name, override) => {
		const runtimeConfig = overridden(override);
		pinBuildOptions(runtimeConfig, BUILT);
		expect(runtimeConfig.public.c15t).toEqual({
			backendURL: 'https://consent.example.com',
			...BUILT,
		});
	});

	test('gives each request its own copy of the mode', () => {
		const first = overridden({ mode: { type: 'hosted' } });
		pinBuildOptions(first, BUILT);
		expect(first.public.c15t.mode).not.toBe(BUILT.mode);
	});

	test('leaves a config without the c15t key alone', () => {
		const runtimeConfig = { public: {} };
		pinBuildOptions(runtimeConfig, BUILT);
		expect(runtimeConfig).toEqual({ public: {} });
	});
});

describe('findOverriddenOptions', () => {
	test('names each option that differs from the build', () => {
		expect(
			findOverriddenOptions(overridden({ routePrefix: '/' }).public.c15t, BUILT)
		).toEqual(['routePrefix']);
		expect(
			findOverriddenOptions(
				overridden({ mode: { type: 'hosted' } }).public.c15t,
				BUILT
			)
		).toEqual(['mode']);
		expect(
			findOverriddenOptions(
				overridden({ mode: { type: 'hosted' }, routePrefix: '/' }).public.c15t,
				BUILT
			)
		).toEqual(['mode', 'routePrefix']);
	});

	test('is empty when the runtime config matches the build', () => {
		expect(findOverriddenOptions(overridden({}).public.c15t, BUILT)).toEqual(
			[]
		);
		expect(
			findOverriddenOptions(
				// Nitro may rebuild the object in another key order.
				overridden({
					mode: Object.fromEntries([
						['type', 'manifest'],
						['resolve', 'browser'],
					]),
				}).public.c15t,
				BUILT
			)
		).toEqual([]);
		expect(findOverriddenOptions(undefined, BUILT)).toEqual([]);
	});
});

describe('createBuildOptionsGuard', () => {
	test('pins an override that first appears on a later request, warning once', () => {
		// Cloudflare applies bindings per request: the first request matches
		// the build, and a later one carries the override.
		const warned: string[] = [];
		const guard = createBuildOptionsGuard(BUILT, (name) => warned.push(name));
		const first = overridden({});
		guard(first);
		expect(first.public.c15t.routePrefix).toBe('/api/c15t');
		expect(warned).toEqual([]);
		for (let request = 0; request < 2; request += 1) {
			const later = overridden({ mode: { type: 'hosted' }, routePrefix: '/' });
			guard(later);
			expect(later.public.c15t).toMatchObject(BUILT);
		}
		expect(warned).toEqual(['mode', 'routePrefix']);
	});
});
