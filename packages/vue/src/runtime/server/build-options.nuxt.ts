/**
 * Nitro plugin: ignores runtime overrides of what the build fixed, through
 * `NUXT_PUBLIC_C15T_MODE_TYPE`, `NUXT_PUBLIC_C15T_MODE_RESOLVE` and
 * `NUXT_PUBLIC_C15T_ROUTE_PREFIX`. When a request's runtime config no
 * longer matches the build, it warns once per option and gives that config
 * the built values back before Nuxt renders or the consent route answers,
 * so the browser (through the payload) runs what the build made. Other mode
 * fields, such as `NUXT_PUBLIC_C15T_MODE_MANIFEST_URL`, still apply. See
 * `./build-options`.
 */
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';

import built from '#c15t/build-options';

import {
	buildOptionVariable,
	createBuildOptionsGuard,
	readBuiltOption,
} from './build-options';
import type { BuiltOptionsRuntimeConfig } from './build-options';

export default defineNitroPlugin((nitroApp) => {
	// Every request, not once at startup: Cloudflare and similar platforms
	// apply environment bindings per request, after this plugin runs.
	const guard = createBuildOptionsGuard(built, (name) => {
		const label = name === 'routePrefix' ? name : `mode.${name}`;
		console.warn(
			`[@c15t/vue] ${buildOptionVariable(name)} is ignored: the build fixed \`c15t.${label}\` as ${JSON.stringify(readBuiltOption(built, name) ?? null)}. Set it in nuxt.config.ts and rebuild.`
		);
	});
	nitroApp.hooks.hook('request', (event) => {
		guard(useRuntimeConfig(event) as unknown as BuiltOptionsRuntimeConfig);
	});
});
