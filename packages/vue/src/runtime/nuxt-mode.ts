/**
 * How the Nuxt module's `mode` and `routePrefix` options read on the
 * server and in the browser. Both come from `nuxt.config.ts` only, so the
 * build and every runtime agree on them.
 */
import type { ConsentMode } from '@c15t/core/modes';
import type { ConsentManifest } from '@c15t/schema/types';

/** Where the module serves its consent route unless `routePrefix` says otherwise. */
export const DEFAULT_NUXT_ROUTE_PREFIX = '/api/c15t';

/** The Nuxt module options that choose where the policy comes from. */
export interface NuxtConsentModeConfig {
	/**
	 * Backend URL. Defaults to `NUXT_PUBLIC_C15T_BACKEND_URL`, read when the
	 * build starts and again by the server at runtime.
	 */
	backendURL?: string;
	/**
	 * Where the visitor's policy comes from: `manifest()`, `hosted()` or
	 * `offline()` from `c15t/vue`. Plain data, read from `nuxt.config.ts`
	 * only.
	 *
	 * @default manifest()
	 */
	mode?: ConsentMode;
	/**
	 * Path of the one consent route the module adds in `manifest()` mode. It
	 * answers `${routePrefix}/init` and `${routePrefix}/manifest`. `false`
	 * adds no route: the server render resolves from the manifest itself,
	 * and the browser asks the backend.
	 *
	 * @default '/api/c15t'
	 */
	routePrefix?: string | false;
}

const trimTrailingSlashes = function trimTrailingSlashes(path: string): string {
	return path.replace(/\/+$/u, '');
};

/**
 * The mode a config names, `manifest()` when it names none.
 *
 * @param config - The module options or the public runtime config.
 * @returns The mode as data.
 * @internal
 */
export const readNuxtMode = function readNuxtMode(
	config: Pick<NuxtConsentModeConfig, 'mode'>
): ConsentMode {
	return config.mode ?? { type: 'manifest' };
};

/**
 * The consent route's path prefix, or `undefined` when the app has no
 * consent route: `routePrefix: false`, or a mode other than `manifest()`.
 *
 * @param config - The module options or the public runtime config.
 * @returns The prefix without a trailing slash.
 * @internal
 */
export const readNuxtRoutePrefix = function readNuxtRoutePrefix(
	config: NuxtConsentModeConfig
): string | undefined {
	if (
		config.routePrefix === false ||
		readNuxtMode(config).type !== 'manifest'
	) {
		return undefined;
	}
	return trimTrailingSlashes(config.routePrefix ?? DEFAULT_NUXT_ROUTE_PREFIX);
};

/**
 * Whether the server render resolves the visitor's policy: `hosted()` and
 * `manifest()`. `manifest({ resolve: 'browser' })` is for pages the server
 * does not render per visitor, and `offline()` resolves in the browser,
 * where its rules and copy load on demand.
 *
 * @param mode - The mode.
 * @returns `true` when the browser receives a resolved policy.
 * @internal
 */
export const resolvesOnServer = function resolvesOnServer(
	mode: ConsentMode
): boolean {
	if (mode.type === 'manifest') {
		return mode.resolve !== 'browser';
	}
	return mode.type === 'hosted';
};

/**
 * The mode the browser runs: browser resolution gets the snapshot the
 * build bundled for it, and `hosted()` forwards the consent headers the
 * server read from the request (a CDN's country, for example) to `/init`.
 *
 * As in every single-page app, a policy that depends on a location that
 * neither `inputs` nor `geoURL` supplies is resolved by the backend's
 * `/init`, never as an unknown location: that could apply another
 * region's rules.
 *
 * @param mode - The mode from `nuxt.config.ts`.
 * @param headers - Consent headers the server read from the request.
 * @param snapshot - The snapshot the build bundled for the browser, if any.
 * @returns The mode for `clientMode()`.
 * @internal
 */
export const withClientData = function withClientData(
	mode: ConsentMode,
	headers: Record<string, string>,
	snapshot: ConsentManifest | undefined
): ConsentMode {
	if (mode.type === 'manifest' && mode.resolve === 'browser') {
		return snapshot && !mode.snapshot
			? { ...mode, snapshot, source: undefined }
			: mode;
	}
	if (mode.type === 'hosted' && Object.keys(headers).length > 0) {
		return { ...mode, headers: { ...headers, ...mode.headers } };
	}
	return mode;
};
