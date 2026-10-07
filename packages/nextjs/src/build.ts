import { writeManifestModule } from '@c15t/core/build';
import type { ManifestBuildOptions } from '@c15t/core/build';
import type { NextConfig } from 'next';
import {
	PHASE_DEVELOPMENT_SERVER,
	PHASE_PRODUCTION_BUILD,
} from 'next/constants.js';

export type { ManifestBuildOptions } from '@c15t/core/build';

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
 * @param config - Existing Next.js configuration, preserved as given.
 * @param options - Backend URL and optional output settings. The build appends
 * `/manifest`. The file defaults
 * to `c15t-manifest.ts` and its type import to `c15t/next/static`.
 * @returns An asynchronous Next.js configuration factory.
 * @throws {Error} When the manifest cannot be fetched or written.
 * @example
 * ```ts
 * import { withConsentManifest } from 'c15t/next/build';
 *
 * export default withConsentManifest({}, {
 *   backendURL: 'https://your-project.inth.app',
 * });
 * ```
 */
export const withConsentManifest =
	(
		config: ConsentNextConfig,
		options: ManifestBuildOptions
	): ((
		phase: string,
		context: { defaultConfig: NextConfig }
	) => Promise<NextConfig>) =>
	async (phase, context) => {
		const resolved =
			typeof config === 'function' ? await config(phase, context) : config;
		if (
			phase === PHASE_PRODUCTION_BUILD ||
			phase === PHASE_DEVELOPMENT_SERVER
		) {
			await writeManifestModule(options, {
				importSource: 'c15t/next/static',
				label: '@c15t/nextjs/build',
				outputFile: 'c15t-manifest.ts',
			});
		}
		return resolved;
	};
