/**
 * Hosted mode for the React provider: core's `hosted()`, with the backend
 * URL the build integration read as the default.
 */
import { hosted as coreHosted } from '@c15t/core';
import type { HostedModeFactory, HostedModeOptions } from '@c15t/core';
import { backendURL as builtBackendURL } from '@c15t/core/generated';

/**
 * Bundlers replace `process.env.NODE_ENV` at build time, so production
 * bundles drop the setup hint behind it.
 */
declare const process: { env: { NODE_ENV?: string } };

/** Options for {@link hosted}. `backendURL` defaults to the build's. */
export type HostedOptions = Omit<HostedModeOptions, 'backendURL'> & {
	/**
	 * Backend URL, relative (`/api/c15t`) or absolute. Defaults to the URL
	 * `consentManifest()` from `c15t/build` read from
	 * `VITE_C15T_BACKEND_URL` or `VITE_INTH_PROJECT_URL`.
	 */
	backendURL?: string;
};

/**
 * Build a hosted factory, taking the backend URL from the build when the
 * options name none.
 *
 * @param options - The page's options.
 * @param buildBackendURL - The backend URL the build read, if any.
 * @returns A hosted transport factory.
 * @throws {Error} When neither names a backend URL.
 * @internal
 */
export const hostedWithBuild = function hostedWithBuild(
	options: HostedOptions,
	buildBackendURL: string | undefined
): HostedModeFactory {
	const backendURL = options.backendURL ?? buildBackendURL;
	if (backendURL === undefined) {
		throw new Error(
			`c15t: hosted() needs \`backendURL\`.${
				process.env.NODE_ENV === 'production'
					? ''
					: ' Pass it, or add consentManifest() from c15t/build to your Vite config and set VITE_C15T_BACKEND_URL (or VITE_INTH_PROJECT_URL).'
			}`
		);
	}
	return coreHosted({ ...options, backendURL });
};

/**
 * Ask the backend's `/init` for every visitor's policy.
 *
 * @param options - Backend URL, init headers and request overrides.
 * @returns A transport factory for the provider's `mode`, carrying its
 * options.
 * @throws {Error} When no backend URL is passed and the build set none.
 * @example
 * ```tsx
 * import { ConsentProvider, hosted } from 'c15t/react';
 *
 * <ConsentProvider options={{ mode: hosted() }}>{children}</ConsentProvider>;
 * ```
 */
export const hosted = function hosted(
	options: HostedOptions = {}
): HostedModeFactory {
	return hostedWithBuild(options, builtBackendURL);
};
