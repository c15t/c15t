/**
 * Nitro plugin: ignores runtime overrides of `mode` and `routePrefix`, such
 * as `NUXT_PUBLIC_C15T_ROUTE_PREFIX`. When a request's runtime config no
 * longer matches the build, it warns once per option and gives that config
 * the built values back before Nuxt renders or the consent route answers,
 * so the browser (through the payload) runs what the build made. See
 * `./build-options`.
 */
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';

import built from '#c15t/build-options';

import { createBuildOptionsGuard } from './build-options';
import type { BuiltOptionsRuntimeConfig } from './build-options';

/** The variable Nuxt maps onto each option. */
const VARIABLES = {
	mode: 'NUXT_PUBLIC_C15T_MODE',
	routePrefix: 'NUXT_PUBLIC_C15T_ROUTE_PREFIX',
} as const;

export default defineNitroPlugin((nitroApp) => {
	// Every request, not once at startup: Cloudflare and similar platforms
	// apply environment bindings per request, after this plugin runs.
	const guard = createBuildOptionsGuard(built, (name) => {
		console.warn(
			`[@c15t/vue] ${VARIABLES[name]} is ignored: the build fixed \`c15t.${name}\` as ${JSON.stringify(built[name])}. Set it in nuxt.config.ts and rebuild.`
		);
	});
	nitroApp.hooks.hook('request', (event) => {
		guard(useRuntimeConfig(event) as unknown as BuiltOptionsRuntimeConfig);
	});
});
