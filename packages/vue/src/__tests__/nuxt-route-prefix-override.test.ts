/**
 * A runtime `NUXT_PUBLIC_C15T_ROUTE_PREFIX` against the consent route the
 * build mounted. Nitro applies the variable to each request's runtime
 * config, which the server render reads and sends to the browser.
 */
import { describe, expect, test } from 'vitest';

import {
	pinRoutePrefix,
	readRoutePrefixOverride,
} from '../runtime/server/route-prefix';

/** A request's runtime config after Nitro applied the variable. */
const overridden = (routePrefix: unknown) => ({
	public: { c15t: { backendURL: 'https://consent.example.com', routePrefix } },
});

describe('pinRoutePrefix', () => {
	test.each([
		['/', '/api/c15t'],
		['/elsewhere', '/api/c15t'],
		['/elsewhere', false],
		[false, '/consent'],
	] as const)(
		'an override of %j gives the browser the built %j',
		(override, built) => {
			const runtimeConfig = overridden(override);
			pinRoutePrefix(runtimeConfig, built);
			expect(runtimeConfig.public.c15t).toEqual({
				backendURL: 'https://consent.example.com',
				routePrefix: built,
			});
		}
	);

	test('leaves a config without the c15t key alone', () => {
		const runtimeConfig = { public: {} };
		pinRoutePrefix(runtimeConfig, '/api/c15t');
		expect(runtimeConfig).toEqual({ public: {} });
	});
});

describe('readRoutePrefixOverride', () => {
	test('names the variable that differs from the build', () => {
		expect(
			readRoutePrefixOverride(
				{ NUXT_PUBLIC_C15T_ROUTE_PREFIX: '/' },
				'/api/c15t'
			)
		).toEqual({ name: 'NUXT_PUBLIC_C15T_ROUTE_PREFIX', value: '/' });
		expect(
			readRoutePrefixOverride(
				{ NITRO_PUBLIC_C15T_ROUTE_PREFIX: '/x' },
				'/api/c15t'
			)
		).toEqual({ name: 'NITRO_PUBLIC_C15T_ROUTE_PREFIX', value: '/x' });
	});

	test('is undefined when unset, empty or equal to the build', () => {
		expect(readRoutePrefixOverride({}, '/api/c15t')).toBeUndefined();
		expect(
			readRoutePrefixOverride(
				{ NUXT_PUBLIC_C15T_ROUTE_PREFIX: '' },
				'/api/c15t'
			)
		).toBeUndefined();
		expect(
			readRoutePrefixOverride(
				{ NUXT_PUBLIC_C15T_ROUTE_PREFIX: '/api/c15t' },
				'/api/c15t'
			)
		).toBeUndefined();
		expect(
			readRoutePrefixOverride({ NUXT_PUBLIC_C15T_ROUTE_PREFIX: 'false' }, false)
		).toBeUndefined();
	});
});
