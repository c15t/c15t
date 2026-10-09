import { relative, sep } from 'node:path';

import {
	GENERATED_MODULE_IDS,
	readBuildEnv,
	writeManifestCacheModule,
} from '@c15t/core/build';
import type {
	ManifestBuildOptions,
	ManifestCacheFiles,
} from '@c15t/core/build';
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
 * The specifiers aliased to the written snapshot: the one the server
 * helpers import, and `@c15t/core/generated` (with its `c15t/generated`
 * re-export) for app code. The packages' own modules there export
 * `undefined`.
 */
const GENERATED_SPECIFIERS = [
	'@c15t/nextjs/generated-manifest',
	...GENERATED_MODULE_IDS,
];

/**
 * Packages whose imports of {@link GENERATED_SPECIFIERS} must be bundled for
 * the alias to apply. The Pages Router leaves dependencies external on the
 * server unless they are transpiled.
 */
const GENERATED_IMPORTERS = ['c15t', '@c15t/core', '@c15t/nextjs'];

type WebpackConfigFunction = NonNullable<NextConfig['webpack']>;

/** A project-relative `./` path, the form Turbopack resolves alias targets in. */
const fromProject = function fromProject(file: string): string {
	const path = relative(process.cwd(), file).split(sep).join('/');
	return path.startsWith('.') ? path : `./${path}`;
};

/**
 * Points {@link GENERATED_SPECIFIERS} at the written modules in both
 * bundlers, keeping any aliases and `webpack` function already set, and
 * transpiles the c15t packages so Pages Router server bundles see the
 * alias. Packages the app lists in `serverExternalPackages` stay external.
 *
 * Server bundles get the snapshot. Browser bundles get the module that
 * imports `server-only`, so a client import fails the build. Turbopack
 * picks it through the `browser` condition, webpack through the client
 * compiler.
 */
const withGeneratedManifestAlias = function withGeneratedManifestAlias(
	config: NextConfig,
	files: ManifestCacheFiles
): NextConfig {
	const external = new Set(config.serverExternalPackages);
	const transpilePackages = [
		...new Set([
			...(config.transpilePackages ?? []),
			...GENERATED_IMPORTERS.filter((name) => !external.has(name)),
		]),
	];
	const turbopackTarget = {
		browser: fromProject(files.browser),
		default: fromProject(files.server),
	};
	const userWebpack = config.webpack ?? undefined;
	const webpack: WebpackConfigFunction = (webpackConfig, context) => {
		const resolved = userWebpack
			? userWebpack(webpackConfig, context)
			: webpackConfig;
		const target = context.isServer ? files.server : files.browser;
		resolved.resolve ??= {};
		resolved.resolve.alias = {
			...resolved.resolve.alias,
			...Object.fromEntries(
				GENERATED_SPECIFIERS.map((specifier) => [`${specifier}$`, target])
			),
		};
		return resolved;
	};
	return {
		...config,
		transpilePackages,
		turbopack: {
			...config.turbopack,
			resolveAlias: {
				...config.turbopack?.resolveAlias,
				...Object.fromEntries(
					GENERATED_SPECIFIERS.map((specifier) => [specifier, turbopackTarget])
				),
			},
		},
		webpack,
	};
};

/**
 * Fetches the deployment's consent manifest before Next.js builds or starts
 * dev, writes it to `node_modules/.cache/c15t/manifest.js`, and hands it to
 * the server helpers. `resolveConsent` and the consent route handlers read
 * it by default. Server code that needs it reads `snapshot` from
 * `@c15t/core/generated` (or `c15t/generated`). Nothing is written into the
 * app's source tree. Production server startup never fetches or rewrites the
 * snapshot.
 *
 * Only server bundles get the snapshot. In a browser bundle the alias points
 * at a module that imports `server-only`, so a client component that
 * imports `@c15t/core/generated` fails the build instead of shipping it.
 *
 * The fetch waits at most 10 seconds. When it fails, `next build` stops with
 * an error, and `next dev` logs a warning and writes a module whose
 * `snapshot` is `undefined`, so the server fetches the policy at runtime. A
 * missing backend URL counts as a failed fetch. Set
 * `onBuildError: 'runtime'` or `'fail'`, or the `C15T_ON_BUILD_ERROR`
 * environment variable, to use one behaviour in both. The fetch is skipped
 * for a `backendURL` that is not absolute http(s), and for
 * `output: 'export'`, which has no server.
 *
 * The snapshot reaches the helpers through a bundler alias. The wrapper adds
 * `c15t`, `@c15t/core` and `@c15t/nextjs` to `transpilePackages`, so Pages
 * Router server bundles apply it too. A package listed in
 * `serverExternalPackages` stays external, does not see the alias, and reads
 * the manifest at runtime instead.
 *
 * @param config - Existing Next.js configuration, preserved as given apart
 * from the alias.
 * @param options - Backend URL and `onBuildError`. `backendURL` defaults to
 * `NEXT_PUBLIC_C15T_BACKEND_URL`, from the environment or a `.env` file, and
 * the build appends `/manifest`.
 * @returns An asynchronous Next.js configuration factory.
 * @throws {Error} When the fetch fails in `'fail'` mode, the default for
 * `next build`, or the snapshot cannot be written.
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
		const files = await writeManifestCacheModule(
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
				skipReason:
					resolved.output === 'export'
						? "a static export (`output: 'export'`) has no server to use it"
						: undefined,
			}
		);
		return withGeneratedManifestAlias(resolved, files);
	};
