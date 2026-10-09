import { existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

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

/** The specifier the package imports the app's `c15t.config.ts` through. */
const USER_CONFIG_SPECIFIER = '@c15t/nextjs/user-config';

/** Config files looked up at the project root, in this order. */
const USER_CONFIG_FILES = [
	'c15t.config.ts',
	'c15t.config.mts',
	'c15t.config.js',
	'c15t.config.mjs',
];

/**
 * Packages whose imports of {@link GENERATED_SPECIFIERS} and
 * {@link USER_CONFIG_SPECIFIER} must be bundled for the alias to apply. The
 * Pages Router leaves dependencies external on the server unless they are
 * transpiled.
 */
const GENERATED_IMPORTERS = ['c15t', '@c15t/core', '@c15t/nextjs'];

type WebpackConfigFunction = NonNullable<NextConfig['webpack']>;

/** The app's `c15t.config.*` at the project root, or `undefined`. */
const findUserConfig = function findUserConfig(
	root: string
): string | undefined {
	for (const name of USER_CONFIG_FILES) {
		const file = join(root, name);
		if (existsSync(file)) {
			return file;
		}
	}
	return undefined;
};

/** A project-relative `./` path, the form Turbopack resolves alias targets in. */
const fromProject = function fromProject(file: string): string {
	const path = relative(process.cwd(), file).split(sep).join('/');
	return path.startsWith('.') ? path : `./${path}`;
};

/**
 * Points {@link GENERATED_SPECIFIERS} at the written modules and
 * {@link USER_CONFIG_SPECIFIER} at the app's `c15t.config.ts` in both
 * bundlers, keeping any aliases and `webpack` function already set, and
 * transpiles the c15t packages so Pages Router server bundles see the
 * aliases. Packages the app lists in `serverExternalPackages` stay
 * external.
 *
 * Server bundles get the snapshot. Browser bundles get the module that
 * imports `server-only`, so a client import fails the build. Turbopack
 * picks it through the `browser` condition, webpack through the client
 * compiler. Both get the same config file.
 */
const withConsentAliases = function withConsentAliases(
	config: NextConfig,
	files: ManifestCacheFiles,
	userConfigFile: string | undefined
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
	const turbopackAliases: Record<string, string | Record<string, string>> =
		Object.fromEntries(
			GENERATED_SPECIFIERS.map((specifier) => [specifier, turbopackTarget])
		);
	if (userConfigFile) {
		turbopackAliases[USER_CONFIG_SPECIFIER] = fromProject(userConfigFile);
	}
	const userWebpack = config.webpack ?? undefined;
	const webpack: WebpackConfigFunction = (webpackConfig, context) => {
		const resolved = userWebpack
			? userWebpack(webpackConfig, context)
			: webpackConfig;
		const target = context.isServer ? files.server : files.browser;
		const aliases: Record<string, string> = Object.fromEntries(
			GENERATED_SPECIFIERS.map((specifier) => [`${specifier}$`, target])
		);
		if (userConfigFile) {
			aliases[`${USER_CONFIG_SPECIFIER}$`] = userConfigFile;
		}
		resolved.resolve ??= {};
		resolved.resolve.alias = { ...resolved.resolve.alias, ...aliases };
		return resolved;
	};
	return {
		...config,
		transpilePackages,
		turbopack: {
			...config.turbopack,
			resolveAlias: {
				...config.turbopack?.resolveAlias,
				...turbopackAliases,
			},
		},
		webpack,
	};
};

/**
 * Finds the app's `c15t.config.ts` and fetches the deployment's consent
 * manifest before Next.js builds or starts dev.
 *
 * `c15t.config.ts` (or `.mts`, `.js`, `.mjs`) at the project root is
 * aliased into server and browser bundles, so `ConsentRoot`,
 * `resolveConsent()`, `createConsentRoute()` and the Pages Router helpers
 * read it without the app importing it. Its default export must be a
 * `defineConsentConfig()` result. Browser bundles include it, so it must
 * hold no secrets.
 *
 * The manifest is written to `node_modules/.cache/c15t/manifest.js` and
 * handed to the server helpers. `resolveConsent` and the consent route handlers read
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
 * The config and the snapshot reach the helpers through bundler aliases.
 * The wrapper adds `c15t`, `@c15t/core` and `@c15t/nextjs` to
 * `transpilePackages`, so Pages Router server bundles apply them too. A
 * package listed in `serverExternalPackages` stays external and does not
 * see the aliases: it reads no config and fetches the manifest at runtime.
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
 *
 * ```ts
 * // c15t.config.ts
 * import { defineConsentConfig } from 'c15t/next';
 *
 * export default defineConsentConfig({});
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
		return withConsentAliases(resolved, files, findUserConfig(process.cwd()));
	};
