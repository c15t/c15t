/**
 * Keeps `mode.type`, `mode.resolve` and `routePrefix` at the values the
 * build used. Nitro applies variables such as
 * `NUXT_PUBLIC_C15T_ROUTE_PREFIX` and `NUXT_PUBLIC_C15T_MODE_TYPE` to each
 * request's runtime config, which the server render reads and sends to the
 * browser. From these three the build chose where the consent route is
 * mounted, which snapshot each bundle holds and which code the browser
 * loads, so they cannot change at runtime. The other mode fields, such as
 * `manifestURL` and `backendURL`, the server reads at runtime, so they stay
 * overridable.
 *
 * @internal
 */
import type { ConsentMode } from '@c15t/core/modes';

/** The options the build used. */
export interface BuiltOptions {
	/** The mode as data, without its snapshot. */
	mode: ConsentMode;
	/** Where the consent route is mounted, or `false` for none. */
	routePrefix: string | false;
}

/**
 * The options a runtime override cannot change: `mode.type`, `mode.resolve`
 * and `routePrefix`.
 */
export type BuiltOptionName = 'resolve' | 'routePrefix' | 'type';

/** The part of the runtime config the step reads and writes. */
export interface BuiltOptionsRuntimeConfig {
	public: { c15t?: Record<string, unknown> };
}

/** The variable Nitro maps onto each option, as a deployment sets it. */
const VARIABLES: Record<BuiltOptionName, string> = {
	resolve: 'NUXT_PUBLIC_C15T_MODE_RESOLVE',
	routePrefix: 'NUXT_PUBLIC_C15T_ROUTE_PREFIX',
	type: 'NUXT_PUBLIC_C15T_MODE_TYPE',
};

/** The order options are checked and reported in. */
const OPTION_NAMES: readonly BuiltOptionName[] = [
	'type',
	'resolve',
	'routePrefix',
];

/**
 * The environment variable that overrides an option at runtime.
 *
 * @param name - The option.
 * @returns The variable, such as `NUXT_PUBLIC_C15T_MODE_TYPE`.
 */
export const buildOptionVariable = function buildOptionVariable(
	name: BuiltOptionName
): string {
	return VARIABLES[name];
};

/** An option's value in a `c15t` config; `undefined` when it is unset. */
const readOption = function readOption(
	c15t: { mode?: unknown; routePrefix?: unknown },
	name: BuiltOptionName
): unknown {
	if (name === 'routePrefix') {
		return c15t.routePrefix;
	}
	const { mode } = c15t;
	return typeof mode === 'object' && mode !== null
		? (mode as Record<string, unknown>)[name]
		: undefined;
};

/**
 * The built value of an option.
 *
 * @param built - The options the build used.
 * @param name - The option.
 * @returns The value; `undefined` for a `resolve` the build left out.
 */
export const readBuiltOption = function readBuiltOption(
	built: BuiltOptions,
	name: BuiltOptionName
): unknown {
	return readOption(built, name);
};

/**
 * The fixed options a runtime config no longer matches. A change to another
 * mode field, such as `manifestURL`, is not an override.
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
	return OPTION_NAMES.filter(
		(name) => readOption(c15t, name) !== readOption(built, name)
	);
};

/**
 * Writes the fixed options back over a runtime override: `mode.type`,
 * `mode.resolve` (removed when the build had none) and `routePrefix`. The
 * request keeps every other mode field it has.
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
	const mode: Record<string, unknown> =
		typeof c15t.mode === 'object' && c15t.mode !== null
			? (c15t.mode as Record<string, unknown>)
			: {};
	mode.type = built.mode.type;
	const resolve = readOption(built, 'resolve');
	if (resolve === undefined) {
		delete mode.resolve;
	} else {
		mode.resolve = resolve;
	}
	c15t.mode = mode;
	c15t.routePrefix = built.routePrefix;
};

/**
 * A check for each request's runtime config. Platforms such as Cloudflare
 * apply environment bindings per request, after server plugins start, so
 * the check runs on every request instead of once at startup. It pins the
 * built options back when an override is present, and reports each
 * overridden option once.
 *
 * @param built - The options the build used.
 * @param warn - Receives the name of each option the first time it is
 * overridden.
 * @returns The check to run with each request's runtime config.
 */
export const createBuildOptionsGuard = function createBuildOptionsGuard(
	built: BuiltOptions,
	warn: (name: BuiltOptionName) => void
): (runtimeConfig: BuiltOptionsRuntimeConfig) => void {
	const warned = new Set<BuiltOptionName>();
	return (runtimeConfig) => {
		const overridden = findOverriddenOptions(runtimeConfig.public.c15t, built);
		if (overridden.length === 0) {
			return;
		}
		for (const name of overridden) {
			if (!warned.has(name)) {
				warned.add(name);
				warn(name);
			}
		}
		pinBuildOptions(runtimeConfig, built);
	};
};
