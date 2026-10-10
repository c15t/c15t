/**
 * Keeps `mode` and `routePrefix` at the values the build used. Nitro applies
 * variables such as `NUXT_PUBLIC_C15T_ROUTE_PREFIX` and
 * `NUXT_PUBLIC_C15T_MODE_TYPE` to each request's runtime config, which the
 * server render reads and sends to the browser. The build already chose
 * from these options where the consent route is mounted, which snapshot
 * each bundle holds and which code the browser loads, so they cannot change
 * at runtime.
 *
 * @internal
 */
import type { ConsentMode } from '@c15t/core/modes';

/** The options the build fixed. */
export interface BuiltOptions {
	/** The mode as data, without its snapshot. */
	mode: ConsentMode;
	/** Where the consent route is mounted, or `false` for none. */
	routePrefix: string | false;
}

/** The option names a runtime override can reach. */
export type BuiltOptionName = keyof BuiltOptions;

/** The part of the runtime config the step reads and writes. */
export interface BuiltOptionsRuntimeConfig {
	public: { c15t?: Record<string, unknown> };
}

/** Whether two JSON values hold the same data, whatever their key order. */
const sameData = function sameData(left: unknown, right: unknown): boolean {
	if (left === right) {
		return true;
	}
	if (
		typeof left !== 'object' ||
		typeof right !== 'object' ||
		left === null ||
		right === null ||
		Array.isArray(left) !== Array.isArray(right)
	) {
		return false;
	}
	const leftRecord = left as Record<string, unknown>;
	const rightRecord = right as Record<string, unknown>;
	const keys = Object.keys(leftRecord);
	return (
		keys.length === Object.keys(rightRecord).length &&
		keys.every(
			(key) =>
				Object.hasOwn(rightRecord, key) &&
				sameData(leftRecord[key], rightRecord[key])
		)
	);
};

/**
 * The built options a runtime config no longer matches.
 *
 * @param c15t - The `public.c15t` runtime config, after Nitro applied the
 * environment.
 * @param built - The options the build used.
 * @returns The names of the options that differ, in a stable order.
 */
export const findOverriddenOptions = function findOverriddenOptions(
	c15t: Record<string, unknown> | undefined,
	built: BuiltOptions
): BuiltOptionName[] {
	if (!c15t) {
		return [];
	}
	return (['mode', 'routePrefix'] as const).filter(
		(name) => !sameData(c15t[name], built[name])
	);
};

/**
 * Writes the built options back over a runtime override.
 *
 * @param runtimeConfig - The request's runtime config, changed in place.
 * @param built - The options the build used.
 */
export const pinBuildOptions = function pinBuildOptions(
	runtimeConfig: BuiltOptionsRuntimeConfig,
	built: BuiltOptions
): void {
	const { c15t } = runtimeConfig.public;
	if (!c15t) {
		return;
	}
	c15t.mode = structuredClone(built.mode);
	c15t.routePrefix = built.routePrefix;
};
