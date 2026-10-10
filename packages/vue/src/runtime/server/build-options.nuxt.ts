/**
 * Nitro plugin: ignores runtime overrides of `mode` and `routePrefix`, such
 * as `NUXT_PUBLIC_C15T_ROUTE_PREFIX`. When the server's runtime config no
 * longer matches the build, it warns once and gives each request's runtime
 * config the built values back before Nuxt renders or the consent route
 * answers, so the browser (through the payload) runs what the build made.
 * See `./build-options`.
 */
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';

import built from '#c15t/build-options';

import { findOverriddenOptions, pinBuildOptions } from './build-options';
import type { BuiltOptionsRuntimeConfig } from './build-options';

/** The variable Nuxt maps onto each option. */
const VARIABLES = {
	mode: 'NUXT_PUBLIC_C15T_MODE',
	routePrefix: 'NUXT_PUBLIC_C15T_ROUTE_PREFIX',
} as const;

export default defineNitroPlugin((nitroApp) => {
	const shared = useRuntimeConfig() as unknown as BuiltOptionsRuntimeConfig;
	const overridden = findOverriddenOptions(shared.public.c15t, built);
	if (overridden.length === 0) {
		return;
	}
	for (const name of overridden) {
		console.warn(
			`[@c15t/vue] ${VARIABLES[name]} is ignored: the build fixed \`c15t.${name}\` as ${JSON.stringify(built[name])}. Set it in nuxt.config.ts and rebuild.`
		);
	}
	nitroApp.hooks.hook('request', (event) => {
		pinBuildOptions(
			useRuntimeConfig(event) as unknown as BuiltOptionsRuntimeConfig,
			built
		);
	});
});
