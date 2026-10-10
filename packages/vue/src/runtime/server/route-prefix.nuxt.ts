/**
 * Nitro plugin: ignores a runtime `NUXT_PUBLIC_C15T_ROUTE_PREFIX`. The
 * consent route is mounted where the build put it, so each request's
 * runtime config gets the built prefix back before Nuxt renders or the
 * route answers, and the browser (through the payload) asks the mounted
 * route. See `./route-prefix`.
 */
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';

import builtRoutePrefix from '#c15t/route-prefix';

import { pinRoutePrefix, readRoutePrefixOverride } from './route-prefix';
import type { RoutePrefixRuntimeConfig } from './route-prefix';

export default defineNitroPlugin((nitroApp) => {
	const override = readRoutePrefixOverride(
		globalThis.process?.env ?? {},
		builtRoutePrefix
	);
	if (!override) {
		return;
	}
	console.warn(
		`[@c15t/vue] ${override.name}=${JSON.stringify(override.value)} is ignored: the consent route was mounted at build time with \`c15t.routePrefix\` ${JSON.stringify(builtRoutePrefix)}. Set it in nuxt.config.ts and rebuild.`
	);
	nitroApp.hooks.hook('request', (event) => {
		pinRoutePrefix(
			useRuntimeConfig(event) as unknown as RoutePrefixRuntimeConfig,
			builtRoutePrefix
		);
	});
});
