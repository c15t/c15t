import { writeManifestModuleWithFallback } from '@c15t/core/build';
import type { ManifestBuildOptions } from '@c15t/core/build';
import type { NextConfig } from 'next';
import {
	PHASE_DEVELOPMENT_SERVER,
	PHASE_PRODUCTION_BUILD,
} from 'next/constants.js';

export type {
	ManifestBuildErrorMode,
	ManifestBuildOptions,
} from '@c15t/core/build';

/** Variable the build reads the backend URL from, like `defineConsentConfig`. */
const BACKEND_URL_ENV = 'NEXT_PUBLIC_C15T_BACKEND_URL';

/** A Next.js configuration object or synchronous/asynchronous factory. */
export type ConsentNextConfig =
	| NextConfig
	| ((
			phase: string,
			context: { defaultConfig: NextConfig }
	  ) => NextConfig | Promise<NextConfig>);

/**
 * Generates a deployment-bound manifest before Next.js builds or starts dev.
 * Import the generated `consentManifest` in server code and pass it as
 * `manifest` to `resolveConsent` and `createNextConsentRouteHandlers`.
 * Production server startup never fetches or rewrites the snapshot.
 *
 * The fetch waits at most 10 seconds. When it fails, `next build` stops with
 * an error, and `next dev` logs a warning and writes a module that exports
 * `undefined`, so the server fetches the policy at runtime. Set
 * `onBuildError: 'runtime'` or `'fail'`, or the `C15T_ON_BUILD_ERROR`
 * environment variable, to use one behaviour in both. The fetch is skipped
 * for a `backendURL` that is not absolute http(s), and for
 * `output: 'export'`, which has no server.
 *
 * @param config - Existing Next.js configuration, preserved as given.
 * @param options - Backend URL and optional output settings. `backendURL`
 * defaults to `NEXT_PUBLIC_C15T_BACKEND_URL`, and the build appends
 * `/manifest`. The file defaults to `c15t-manifest.ts` and its type import
 * to `c15t/next/static`.
 * @returns An asynchronous Next.js configuration factory.
 * @throws {Error} When the fetch fails in `'fail'` mode, the default for
 * `next build`, or the generated file cannot be written.
 * @example
 * ```ts
 * import { withConsentManifest } from 'c15t/next/build';
 *
 * // Reads NEXT_PUBLIC_C15T_BACKEND_URL, like defineConsentConfig.
 * export default withConsentManifest({});
 * ```
 */
export const withConsentManifest =
	(
		config: ConsentNextConfig,
		options: ManifestBuildOptions = {}
	): ((
		phase: string,
		context: { defaultConfig: NextConfig }
	) => Promise<NextConfig>) =>
	async (phase, context) => {
		const resolved =
			typeof config === 'function' ? await config(phase, context) : config;
		if (
			phase !== PHASE_PRODUCTION_BUILD &&
			phase !== PHASE_DEVELOPMENT_SERVER
		) {
			return resolved;
		}
		await writeManifestModuleWithFallback(
			{
				...options,
				backendURL: options.backendURL ?? process.env[BACKEND_URL_ENV],
			},
			{
				command: phase === PHASE_PRODUCTION_BUILD ? 'build' : 'dev',
				envNames: [BACKEND_URL_ENV],
				importSource: 'c15t/next/static',
				label: '@c15t/nextjs/build',
				outputFile: 'c15t-manifest.ts',
				skipReason:
					resolved.output === 'export'
						? "a static export (`output: 'export'`) has no server to use it"
						: undefined,
			}
		);
		return resolved;
	};
