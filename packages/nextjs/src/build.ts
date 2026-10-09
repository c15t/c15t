import { relative, sep } from 'node:path';

import {
	readBuildEnv,
	writeManifestModuleWithFallback,
} from '@c15t/core/build';
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
 * The specifier the server helpers import the snapshot through. The
 * package's own module there exports `undefined`.
 */
const GENERATED_MANIFEST_SPECIFIER = '@c15t/nextjs/generated-manifest';

type WebpackConfigFunction = NonNullable<NextConfig['webpack']>;

/**
 * Points {@link GENERATED_MANIFEST_SPECIFIER} at the generated module in
 * both bundlers, keeping any aliases and `webpack` function already set.
 * Turbopack resolves alias targets from the project directory, so its
 * target is a `./` path; webpack takes the absolute path.
 */
const withGeneratedManifestAlias = function withGeneratedManifestAlias(
	config: NextConfig,
	outputFile: string
): NextConfig {
	const fromProject = relative(process.cwd(), outputFile).split(sep).join('/');
	const turbopackTarget = fromProject.startsWith('.')
		? fromProject
		: `./${fromProject}`;
	const userWebpack = config.webpack ?? undefined;
	const webpack: WebpackConfigFunction = (webpackConfig, context) => {
		const resolved = userWebpack
			? userWebpack(webpackConfig, context)
			: webpackConfig;
		resolved.resolve ??= {};
		resolved.resolve.alias = {
			...resolved.resolve.alias,
			[`${GENERATED_MANIFEST_SPECIFIER}$`]: outputFile,
		};
		return resolved;
	};
	return {
		...config,
		turbopack: {
			...config.turbopack,
			resolveAlias: {
				...config.turbopack?.resolveAlias,
				[GENERATED_MANIFEST_SPECIFIER]: turbopackTarget,
			},
		},
		webpack,
	};
};

/**
 * Generates a deployment-bound manifest before Next.js builds or starts dev,
 * and hands it to the server helpers. `resolveConsent` and the consent route
 * handlers read it by default, so the app never imports the generated file.
 * Production server startup never fetches or rewrites the snapshot.
 *
 * The fetch waits at most 10 seconds. When it fails, `next build` stops with
 * an error, and `next dev` logs a warning and writes a module that exports
 * `undefined`, so the server fetches the policy at runtime. A missing backend
 * URL counts as a failed fetch. Set `onBuildError: 'runtime'` or `'fail'`, or
 * the `C15T_ON_BUILD_ERROR` environment variable, to use one behaviour in
 * both. The fetch is skipped for a `backendURL` that is not absolute
 * http(s), and for `output: 'export'`, which has no server.
 *
 * The snapshot reaches the helpers through a bundler alias. A server bundle
 * that leaves `@c15t/nextjs` external (`serverExternalPackages`, or the
 * Pages Router's default externals) does not see it and reads the manifest at
 * runtime instead; pass the generated `consentManifest` as `manifest` there.
 *
 * @param config - Existing Next.js configuration, preserved as given apart
 * from the alias.
 * @param options - Backend URL and optional output settings. `backendURL`
 * defaults to `NEXT_PUBLIC_C15T_BACKEND_URL`, from the environment or a
 * `.env` file, and the build appends `/manifest`. The file defaults to
 * `c15t-manifest.ts` and its type import to `c15t/next/static`.
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
		const outputFile = await writeManifestModuleWithFallback(
			{
				...options,
				backendURL:
					options.backendURL ??
					readBuildEnv([BACKEND_URL_ENV], {
						mode:
							phase === PHASE_PRODUCTION_BUILD ? 'production' : 'development',
						root: process.cwd(),
					}),
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
		// A renamed export is not what the helpers import.
		if (options.exportName && options.exportName !== 'consentManifest') {
			return resolved;
		}
		return withGeneratedManifestAlias(resolved, outputFile);
	};
