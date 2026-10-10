import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

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

import type { ConsentConfig } from './config';

export type {
	ManifestBuildErrorMode,
	ManifestBuildOptions,
} from '@c15t/core/build';

/** Variable the build reads the backend URL from, like `defineConsentConfig`. */
const BACKEND_URL_ENV = 'NEXT_PUBLIC_C15T_BACKEND_URL';

/**
 * The Inth project URL, shared with other Inth SDKs. Read when
 * {@link BACKEND_URL_ENV} is unset.
 */
const INTH_URL_ENV = 'NEXT_PUBLIC_INTH_PROJECT_URL';

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

/**
 * Next.js's own loader for `next.config.ts`: compiles a TypeScript file with
 * SWC, honouring the project's `tsconfig.json` paths, and evaluates it.
 * Next.js 15 names the root `cwd`, 16 names it `dir`.
 */
type TranspileConfig = (options: {
	configFileName: string;
	cwd: string;
	dir: string;
	nextConfigPath: string;
}) => Promise<unknown>;

/** Evaluates a config file and returns its exports. */
const importConfigFile = async function importConfigFile(
	file: string,
	root: string
): Promise<unknown> {
	if (!/\.m?ts$/u.test(file)) {
		return await import(pathToFileURL(file).href);
	}
	// Next.js 15 installs TypeScript when it can't find it. Never let
	// reading the config install packages.
	createRequire(join(root, 'package.json')).resolve('typescript');
	const { transpileConfig } =
		(await import('next/dist/build/next-config-ts/transpile-config.js')) as unknown as {
			transpileConfig: TranspileConfig;
		};
	return await transpileConfig({
		configFileName: basename(file),
		cwd: root,
		dir: root,
		nextConfigPath: file,
	});
};

/**
 * The default export of the app's `c15t.config.*`, evaluated with the loader
 * Next.js uses for `next.config.ts`, so the build sees the same `mode` and
 * `backendURL` as the bundles.
 *
 * A config `defineConsentConfig` rejects stops the build with its error.
 * One that can't be evaluated here for another reason (an import Node
 * can't load, say) warns and reads as no config: the build then fetches the
 * manifest as for `manifest()`, as it did before it read the file.
 *
 * @throws {TypeError} When `defineConsentConfig` rejects the config.
 */
const loadUserConfig = async function loadUserConfig(
	file: string,
	root: string
): Promise<ConsentConfig | undefined> {
	try {
		const loaded = (await importConfigFile(file, root)) as
			| { default?: unknown }
			| undefined;
		const config = loaded?.default ?? loaded;
		return typeof config === 'object' && config !== null
			? (config as ConsentConfig)
			: undefined;
	} catch (error) {
		// Next.js wraps the evaluation error as its `cause`.
		const parts = [error, (error as { cause?: unknown } | null)?.cause].filter(
			(part) => part !== undefined
		);
		// `defineConsentConfig` rejected the config: the server render
		// would too, so stop here.
		const rejected = parts.find(
			(part) =>
				part instanceof Error && part.message.startsWith('@c15t/nextjs: ')
		);
		if (rejected) {
			throw rejected;
		}
		const reason = parts
			.map((part) => (part instanceof Error ? part.message : String(part)))
			.join(': ');
		console.warn(
			`@c15t/nextjs/build: could not read ${relative(root, file)} (${reason}), so the build fetches the consent manifest as for manifest().`
		);
		return undefined;
	}
};

/**
 * Why the config's mode needs no build-time manifest, as Nuxt and Astro
 * decide: `hosted()` and `offline()` have none to fetch, a `snapshot` is
 * already one, and `manifest({ source: 'runtime' })` always fetches at
 * runtime. `undefined` when the build should fetch it.
 */
const modeSkipReason = function modeSkipReason(
	config: ConsentConfig | undefined
): string | undefined {
	const mode = config?.mode;
	if (mode?.type === 'hosted') {
		return 'c15t.config.ts uses hosted(), which asks the backend for each visitor';
	}
	if (mode?.type === 'offline') {
		return 'c15t.config.ts uses offline(), which needs no backend';
	}
	if (mode?.snapshot) {
		return 'c15t.config.ts passes manifest({ snapshot })';
	}
	if (mode?.source === 'runtime') {
		return "c15t.config.ts sets manifest({ source: 'runtime' })";
	}
	// The server fetches an absolute manifestURL at runtime and ignores a
	// build snapshot. A `/` path is the browser's, so it still needs one.
	const url = mode?.manifestURL;
	if (url !== undefined && (!url.startsWith('/') || url.startsWith('//'))) {
		return 'c15t.config.ts passes an absolute manifest({ manifestURL })';
	}
	return undefined;
};

/**
 * `NEXT_PUBLIC_INTH_PROJECT_URL` when `NEXT_PUBLIC_C15T_BACKEND_URL` is
 * unset, copied to `NEXT_PUBLIC_C15T_BACKEND_URL` in the process
 * environment. `c15t.config.ts`, evaluated next, reads the c15t name, and
 * the caller also adds it to the config's `env`, so bundles inline one
 * value and the browser gets no second read.
 *
 * @returns The Inth URL that was copied, or `undefined`.
 */
const exposeInthProjectURL = function exposeInthProjectURL(
	root: string,
	phase: string
): string | undefined {
	const envOptions = {
		mode: phase === PHASE_PRODUCTION_BUILD ? 'production' : 'development',
		root,
	};
	if (readBuildEnv([BACKEND_URL_ENV], envOptions)) {
		return undefined;
	}
	const inth = readBuildEnv([INTH_URL_ENV], envOptions);
	if (inth) {
		process.env[BACKEND_URL_ENV] = inth;
	}
	return inth;
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
 * for a `backendURL` that is not absolute http(s), for `output: 'export'`,
 * which has no server, and when `c15t.config.ts` sets a mode that reads no
 * build-time manifest: `hosted()`, `offline()`, `manifest({ snapshot })` or
 * `manifest({ source: 'runtime' })`. The wrapper evaluates the file with the
 * loader Next.js uses for `next.config.ts` to read its `mode` and
 * `backendURL`.
 *
 * The config and the snapshot reach the helpers through bundler aliases.
 * The wrapper adds `c15t`, `@c15t/core` and `@c15t/nextjs` to
 * `transpilePackages`, so Pages Router server bundles apply them too. A
 * package listed in `serverExternalPackages` stays external and does not
 * see the aliases: it reads no config and fetches the manifest at runtime.
 *
 * When `NEXT_PUBLIC_C15T_BACKEND_URL` is unset, the wrapper reads
 * `NEXT_PUBLIC_INTH_PROJECT_URL` instead and sets
 * `NEXT_PUBLIC_C15T_BACKEND_URL` to it, in the environment and in the
 * config's `env`, so every reader of the c15t name sees the same URL.
 *
 * @param config - Existing Next.js configuration, preserved as given apart
 * from the alias and, for the Inth variable, `env`.
 * @param options - Backend URL and `onBuildError`. `backendURL` defaults to
 * the one in `c15t.config.ts`, then `NEXT_PUBLIC_C15T_BACKEND_URL`, then
 * `NEXT_PUBLIC_INTH_PROJECT_URL`, from the environment or a `.env` file,
 * and the build appends `/manifest`.
 * @returns An asynchronous Next.js configuration factory.
 * @throws {Error} When the fetch fails in `'fail'` mode, the default for
 * `next build`, the snapshot cannot be written, or `defineConsentConfig`
 * rejects `c15t.config.ts`.
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
		const root = process.cwd();
		const inthURL = exposeInthProjectURL(root, phase);
		const given =
			typeof config === 'function' ? await config(phase, context) : config;
		const resolved: NextConfig =
			inthURL === undefined
				? given
				: { ...given, env: { ...given.env, [BACKEND_URL_ENV]: inthURL } };
		if (
			phase !== PHASE_PRODUCTION_BUILD &&
			phase !== PHASE_DEVELOPMENT_SERVER
		) {
			return resolved;
		}
		const userConfigFile = findUserConfig(root);
		const userConfig = userConfigFile
			? await loadUserConfig(userConfigFile, root)
			: undefined;
		const files = await writeManifestCacheModule(
			{
				...options,
				backendURL:
					options.backendURL ??
					userConfig?.backendURL ??
					readBuildEnv([BACKEND_URL_ENV, INTH_URL_ENV], {
						mode:
							phase === PHASE_PRODUCTION_BUILD ? 'production' : 'development',
						root,
					}),
			},
			{
				command: phase === PHASE_PRODUCTION_BUILD ? 'build' : 'dev',
				envNames: [BACKEND_URL_ENV, INTH_URL_ENV],
				importSource: 'c15t/next/static',
				label: '@c15t/nextjs/build',
				skipReason:
					resolved.output === 'export'
						? "a static export (`output: 'export'`) has no server to use it"
						: modeSkipReason(userConfig),
			}
		);
		return withConsentAliases(resolved, files, userConfigFile);
	};
