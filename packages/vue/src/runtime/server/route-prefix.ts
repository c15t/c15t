/**
 * Keeps the consent route's prefix at the value the build mounted the route
 * at. Nitro applies `NUXT_PUBLIC_C15T_ROUTE_PREFIX` to each request's
 * runtime config, which the server render reads and sends to the browser,
 * but the route itself cannot move after the build.
 *
 * @internal
 */

/** The part of the runtime config the step reads and writes. */
export interface RoutePrefixRuntimeConfig {
	public: { c15t?: { routePrefix?: unknown } };
}

/** The variables Nitro maps onto `public.c15t.routePrefix`. */
const ROUTE_PREFIX_VARIABLES = [
	'NUXT_PUBLIC_C15T_ROUTE_PREFIX',
	'NITRO_PUBLIC_C15T_ROUTE_PREFIX',
] as const;

/**
 * Writes the built prefix back over a runtime override.
 *
 * @param runtimeConfig - The request's runtime config, changed in place.
 * @param built - The prefix the build mounted the route at, or `false`.
 */
export const pinRoutePrefix = function pinRoutePrefix(
	runtimeConfig: RoutePrefixRuntimeConfig,
	built: string | false
): void {
	const { c15t } = runtimeConfig.public;
	if (c15t && c15t.routePrefix !== built) {
		c15t.routePrefix = built;
	}
};

/**
 * The variable that tries to move the prefix, when one is set to a value
 * other than the build's. Empty values count as unset.
 *
 * @param env - The server's environment variables.
 * @param built - The prefix the build mounted the route at, or `false`.
 * @returns The variable's name and value, or `undefined`.
 */
export const readRoutePrefixOverride = function readRoutePrefixOverride(
	env: Record<string, string | undefined>,
	built: string | false
): { name: string; value: string } | undefined {
	for (const name of ROUTE_PREFIX_VARIABLES) {
		const value = env[name];
		if (value && value !== String(built)) {
			return { name, value };
		}
	}
	return undefined;
};
