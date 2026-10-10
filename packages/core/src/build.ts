/** Node-only manifest generation for framework build integrations. */
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import type { ConsentManifest } from '@c15t/schema/types';

import { loadStaticManifest } from './server/static-manifest';
import { manifestNeedsLocation } from './transports/manifest-browser';

export type { ConsentManifest } from '@c15t/schema/types';

const resolveBuildManifestURL = (
	options: {
		backendURL?: string;
		manifestURL?: string;
	},
	label: string
): string => {
	const source = options.manifestURL ?? options.backendURL;
	let url: URL;
	try {
		url = new URL(source ?? '');
	} catch {
		throw new Error(
			`${label}: build-time manifests require an absolute upstream URL.`
		);
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(
			`${label}: build-time manifests require an http(s) upstream URL.`
		);
	}
	if (options.manifestURL === undefined) {
		url.pathname = `${url.pathname.replace(/\/+$/u, '')}/manifest`;
	}
	return url.href;
};

/**
 * Loads a snapshot from an absolute upstream URL during framework setup.
 * @param options - Manifest URL, or backend URL whose `/manifest` is read.
 * @param label - Framework name for errors.
 * @returns The deployment's manifest.
 * @throws {Error} When the source is relative, missing or cannot be fetched.
 * @internal
 */
export const loadBuildManifest = (
	options: {
		backendURL?: string;
		manifestURL?: string;
		fetch?: typeof globalThis.fetch;
	},
	label: string
): Promise<ConsentManifest> =>
	loadStaticManifest(
		{
			fetch: options.fetch,
			manifestURL: resolveBuildManifestURL(options, label),
		},
		label
	);

/**
 * Longest a build or dev server waits for the manifest, in milliseconds.
 * A backend that never answers then counts as a failed fetch instead of
 * holding the command.
 */
const BUILD_MANIFEST_TIMEOUT_MS = 10_000;

/**
 * Whether a build can fetch the manifest: the upstream URL is absolute
 * http(s). A relative URL points at the app being built.
 * @param options - Manifest URL, or backend URL whose `/manifest` is read.
 * @returns `true` when {@link loadBuildManifest} has a URL to fetch.
 * @internal
 */
export const hasBuildManifestSource = (options: {
	backendURL?: string;
	manifestURL?: string;
}): boolean => {
	try {
		resolveBuildManifestURL(options, '');
		return true;
	} catch {
		return false;
	}
};

/**
 * What happens when the build-time manifest fetch fails. `'fail'` stops the
 * command with an error. `'runtime'` logs a warning, and the server fetches
 * the policy at runtime.
 */
export type ManifestBuildErrorMode = 'runtime' | 'fail';

/** Whether the framework is building for production or running dev. */
export type ManifestBuildCommand = 'build' | 'dev';

/** Environment variable that overrides `onBuildError` in every framework. */
export const MANIFEST_BUILD_ERROR_ENV = 'C15T_ON_BUILD_ERROR';

const isBuildErrorMode = (value: unknown): value is ManifestBuildErrorMode =>
	value === 'runtime' || value === 'fail';

/**
 * Decides what a failed manifest fetch does. `C15T_ON_BUILD_ERROR` wins over
 * `onBuildError`. Without either, a production build fails and dev falls
 * back to runtime fetching.
 * @param onBuildError - The configured option, if any.
 * @param command - Whether this is a production build or dev.
 * @param label - Framework name for errors.
 * @param env - Environment to read the override from.
 * @returns The mode, and whether the user chose it.
 * @throws {Error} When the option or the variable has another value.
 * @internal
 */
export const resolveManifestBuildErrorMode = (
	onBuildError: unknown,
	command: ManifestBuildCommand,
	label: string,
	env: Record<string, string | undefined> = process.env
): { explicit: boolean; mode: ManifestBuildErrorMode } => {
	const fromEnv = env[MANIFEST_BUILD_ERROR_ENV];
	if (fromEnv) {
		if (!isBuildErrorMode(fromEnv)) {
			throw new Error(
				`${label}: ${MANIFEST_BUILD_ERROR_ENV} must be 'runtime' or 'fail', received ${JSON.stringify(fromEnv)}.`
			);
		}
		return { explicit: true, mode: fromEnv };
	}
	if (onBuildError !== undefined) {
		if (!isBuildErrorMode(onBuildError)) {
			throw new Error(
				`${label}: onBuildError must be 'runtime' or 'fail', received ${JSON.stringify(onBuildError)}.`
			);
		}
		return { explicit: true, mode: onBuildError };
	}
	return { explicit: false, mode: command === 'build' ? 'fail' : 'runtime' };
};

/** Values in a `.env` file. Handles `export`, quotes and comments. */
const parseEnvFile = (source: string): Record<string, string> => {
	const values: Record<string, string> = {};
	for (const raw of source.split(/\r?\n/u)) {
		const line = raw.trim().replace(/^export\s+/u, '');
		const equals = line.indexOf('=');
		if (line.startsWith('#') || equals < 1) {
			continue;
		}
		const key = line.slice(0, equals).trim();
		let value = line.slice(equals + 1).trim();
		const [quote] = value;
		if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
			value = value.slice(1, -1);
		} else {
			value = value.replace(/\s+#.*$/u, '');
		}
		values[key] = value;
	}
	return values;
};

/**
 * Reads the first of `names` that is set, the way Vite resolves variables:
 * values the framework already loaded, then the process environment, then
 * `.env.[mode].local`, `.env.[mode]`, `.env.local` and `.env` in `root`.
 * @param names - Variable names in order of preference.
 * @param options - Variables the framework loaded, the directory with the
 * `.env` files and the mode, such as `production`.
 * @returns The value, or `undefined` when none of the names is set.
 * @internal
 */
export const readBuildEnv = (
	names: readonly string[],
	options: {
		env?: Record<string, unknown>;
		mode?: string;
		root?: string;
	} = {}
): string | undefined => {
	for (const name of names) {
		const loaded = options.env?.[name];
		if (typeof loaded === 'string') {
			return loaded;
		}
		const fromProcess = process.env[name];
		if (fromProcess !== undefined) {
			return fromProcess;
		}
	}
	if (!options.root) {
		return undefined;
	}
	const files = [
		...(options.mode
			? [`.env.${options.mode}.local`, `.env.${options.mode}`]
			: []),
		'.env.local',
		'.env',
	];
	const parsed = files.map((file) => {
		try {
			return parseEnvFile(
				readFileSync(resolve(options.root ?? '', file), 'utf8')
			);
		} catch {
			return {};
		}
	});
	for (const name of names) {
		for (const values of parsed) {
			if (values[name] !== undefined) {
				return values[name];
			}
		}
	}
	return undefined;
};

/** Where a build reports a skipped or failed manifest fetch. */
export interface ManifestBuildLogger {
	info: (message: string) => void;
	warn: (message: string) => void;
}

/**
 * Prefixes every message with the framework label, for loggers that do not
 * add one themselves.
 * @param label - Framework name.
 * @param logger - Where messages go. Defaults to the console.
 * @returns The labelled logger.
 * @internal
 */
export const labelledBuildLogger = (
	label: string,
	logger: ManifestBuildLogger = console
): ManifestBuildLogger => ({
	info: (message) => logger.info(`${label}: ${message}`),
	warn: (message) => logger.warn(`${label}: ${message}`),
});

/** How a framework integration loads the build-time manifest. */
export interface ManifestBuildPolicy {
	/** Production build or dev. Decides the default for `onBuildError`. */
	command: ManifestBuildCommand;
	/** Variables that can carry the backend URL, named in messages. */
	envNames?: readonly string[];
	/** Framework name for errors. */
	label: string;
	/** Receives skip notices and warnings, without the label. */
	logger: ManifestBuildLogger;
	/** The configured `onBuildError`. */
	onBuildError?: unknown;
	/**
	 * Why the framework cannot use a snapshot, such as a static export. The
	 * fetch is skipped and never fails.
	 */
	skipReason?: string;
}

const describeFailure = (error: unknown, label: string): string => {
	if (error instanceof Error && error.name === 'TimeoutError') {
		return `no response within ${BUILD_MANIFEST_TIMEOUT_MS / 1000} seconds`;
	}
	let reason = error instanceof Error ? error.message : String(error);
	const prefix = `${label}: `;
	if (reason.startsWith(prefix)) {
		reason = reason.slice(prefix.length);
	}
	// A network error is a bare `fetch failed`; the useful part, such as
	// ECONNREFUSED, is in its cause.
	if (error instanceof TypeError && error.cause instanceof Error) {
		reason = `${reason}: ${error.cause.message}`;
	}
	return reason;
};

/**
 * Applies the build policy to a missing backend URL, which counts as a
 * failed fetch: `'fail'` throws, an explicit `'runtime'` logs a notice, and
 * the dev default warns.
 */
const reportMissingSource = (
	policy: ManifestBuildPolicy,
	resolved: { explicit: boolean; mode: ManifestBuildErrorMode },
	envHint: string
): void => {
	const { command, label, logger } = policy;
	const missing = `no backend URL is set, so ${command === 'build' ? 'the build' : 'dev'} cannot fetch the consent manifest.${envHint}`;
	if (resolved.mode === 'fail') {
		throw new Error(
			`${label}: ${missing} Set \`${MANIFEST_BUILD_ERROR_ENV}=runtime\` (or \`onBuildError: 'runtime'\`) to ${command === 'build' ? 'build' : 'run dev'} without a snapshot.`
		);
	}
	if (resolved.explicit) {
		logger.info(
			`skipped the consent manifest fetch because no backend URL is set.${envHint}`
		);
		return;
	}
	logger.warn(`${missing} A production build stops on this error.`);
};

/**
 * Loads the snapshot a framework integration bundles, following one policy
 * in every framework:
 *
 * - The fetch waits at most 10 seconds.
 * - When it fails, `onBuildError` decides: `'fail'` throws, `'runtime'`
 *   warns and returns `undefined` so the server fetches the policy at
 *   runtime. `C15T_ON_BUILD_ERROR` overrides the option. Without either, a
 *   production build fails and dev warns.
 * - A missing backend URL counts as a failed fetch: a production build
 *   fails, dev warns, and an explicit `'runtime'` skips with a notice.
 * - A framework `skipReason` skips the fetch. So does a relative or
 *   non-http(s) URL, unless `onBuildError` is explicitly `'fail'`, which
 *   then throws.
 *
 * @param source - Manifest URL, or backend URL whose `/manifest` is read.
 * @param policy - Command, label, logger, `onBuildError` and skip reason.
 * @returns The deployment's manifest, or `undefined` to fetch at runtime.
 * @throws {Error} When the fetch fails in `'fail'` mode, or `onBuildError`
 * or `C15T_ON_BUILD_ERROR` has an unknown value.
 * @internal
 */
export const loadManifestForBuild = async (
	source: {
		backendURL?: string;
		manifestURL?: string;
		fetch?: typeof globalThis.fetch;
	},
	policy: ManifestBuildPolicy
): Promise<ConsentManifest | undefined> => {
	const { command, label, logger } = policy;
	const { explicit, mode } = resolveManifestBuildErrorMode(
		policy.onBuildError,
		command,
		label
	);
	if (policy.skipReason) {
		logger.info(
			`skipped the consent manifest fetch because ${policy.skipReason}.`
		);
		return undefined;
	}
	const envHint = policy.envNames?.length
		? ` Pass backendURL or set ${policy.envNames.join(' or ')}.`
		: '';
	const configured = source.manifestURL ?? source.backendURL;
	if (!configured) {
		reportMissingSource(policy, { explicit, mode }, envHint);
		return undefined;
	}
	if (!hasBuildManifestSource(source)) {
		if (explicit && mode === 'fail') {
			try {
				resolveBuildManifestURL(source, label);
			} catch (error) {
				throw new Error(`${(error as Error).message}${envHint}`, {
					cause: error,
				});
			}
		}
		logger.info(
			`skipped the consent manifest fetch because ${JSON.stringify(configured)} is not an absolute http(s) URL, so the server fetches the policy at runtime.`
		);
		return undefined;
	}
	const fetchImpl = source.fetch ?? globalThis.fetch?.bind(globalThis);
	const url = resolveBuildManifestURL(source, label);
	const phase = command === 'build' ? 'the build' : 'dev';
	try {
		return await loadBuildManifest(
			{
				...source,
				fetch:
					fetchImpl &&
					((input, init) =>
						fetchImpl(input, {
							...init,
							signal: AbortSignal.timeout(BUILD_MANIFEST_TIMEOUT_MS),
						})),
			},
			label
		);
	} catch (error) {
		const failure = `could not fetch the consent manifest from ${url} during ${phase} (${describeFailure(error, label)}).`;
		if (mode === 'fail') {
			throw new Error(
				`${label}: ${failure} Set \`${MANIFEST_BUILD_ERROR_ENV}=runtime\` (or \`onBuildError: 'runtime'\`) to ${command === 'build' ? 'deploy' : 'run dev'} with runtime fetching.`,
				{ cause: error }
			);
		}
		logger.warn(
			`${failure} The server fetches it at runtime instead.${
				explicit ? '' : ' A production build stops on this error.'
			}`
		);
		return undefined;
	}
};

/** Options every build integration takes. */
export interface ManifestBuildOptions {
	/**
	 * Absolute backend base URL. The build appends `/manifest`. Framework
	 * integrations read their public backend URL variable when it is unset.
	 */
	backendURL?: string;
	/**
	 * What a failed manifest fetch does. `'fail'` stops the command.
	 * `'runtime'` logs a warning, and the server fetches the policy at
	 * runtime. Unset, a production build fails and dev warns. The
	 * `C15T_ON_BUILD_ERROR` environment variable overrides this option.
	 */
	onBuildError?: ManifestBuildErrorMode;
	/**
	 * Fetch implementation for the manifest request.
	 * @internal
	 */
	fetch?: typeof globalThis.fetch;
}

/** What `@c15t/core/generated` exports. */
export interface GeneratedManifestModule {
	/** The backend URL the build read the manifest from. */
	backendURL: string | undefined;
	/** The fetched manifest, or `undefined` to read it at runtime. */
	snapshot: ConsentManifest | undefined;
}

/**
 * Specifiers the build integrations answer with the fetched snapshot:
 * `@c15t/core/generated` and its `c15t/generated` re-export.
 * @internal
 */
export const GENERATED_MODULE_IDS = [
	'@c15t/core/generated',
	'c15t/generated',
] as const;

/** Where non-Vite builds write the snapshot, relative to the app root. */
export const MANIFEST_CACHE_DIR = 'node_modules/.cache/c15t';

/**
 * Renders the module behind `@c15t/core/generated`. With `serverOnly`, it
 * imports `server-only`, so a bundler that knows the marker (Next.js) fails
 * the build when client code imports it. With `clientStub`, `snapshot` is
 * `undefined` whatever the build fetched.
 * @param module - Backend URL and snapshot.
 * @param options - Whether to leave the snapshot out, and whether to add
 * the `server-only` import.
 * @returns JavaScript source.
 * @internal
 */
export const renderGeneratedModule = (
	module: GeneratedManifestModule,
	options: { clientStub?: boolean; serverOnly?: boolean } = {}
): string => {
	let snapshot = `export const snapshot = ${JSON.stringify(module.snapshot, null, 2)};`;
	if (options.clientStub) {
		snapshot =
			'// The snapshot stays on the server; the browser bundle never gets it.\nexport const snapshot = undefined;';
	} else if (!module.snapshot) {
		snapshot =
			'// The build has no snapshot, so the policy is read at runtime.\nexport const snapshot = undefined;';
	}
	return [
		'// Written by the c15t build integration. Do not edit.',
		...(options.serverOnly ? ["import 'server-only';"] : []),
		`export const backendURL = ${JSON.stringify(module.backendURL) ?? 'undefined'};`,
		snapshot,
		'',
	].join('\n');
};

/**
 * Renders declarations for a written `@c15t/core/generated` module.
 * @param importSource - Module the `ConsentManifest` type is imported from.
 * @returns TypeScript declarations.
 * @internal
 */
export const renderGeneratedDeclarations = (importSource: string): string =>
	[
		`import type { ConsentManifest } from '${importSource}';`,
		'',
		'export declare const backendURL: string | undefined;',
		'export declare const snapshot: ConsentManifest | undefined;',
		'',
	].join('\n');

/** Writes `source` unless the file already holds it, so watchers stay quiet. */
const writeModuleFile = async (
	outputFile: string,
	source: string
): Promise<string> => {
	let current: string | undefined;
	try {
		current = await readFile(outputFile, 'utf8');
	} catch (error) {
		if (
			!(error instanceof Error && 'code' in error && error.code === 'ENOENT')
		) {
			throw error;
		}
	}
	if (current !== source) {
		await mkdir(dirname(outputFile), { recursive: true });
		await writeFile(outputFile, source, 'utf8');
	}
	return outputFile;
};

/** The files {@link writeManifestCacheModule} writes. */
export interface ManifestCacheFiles {
	/** The module for browser bundles: `server-only`, and no snapshot. */
	browser: string;
	/** The module for server bundles, with the snapshot. */
	server: string;
}

/**
 * Fetches the snapshot under the policy of {@link loadManifestForBuild} and
 * writes it under `node_modules/.cache/c15t/`, for bundlers without virtual
 * modules. `manifest.js` holds the snapshot for server bundles.
 * `manifest.browser.js` is for browser bundles: it imports `server-only`, so
 * a bundler that knows the marker (Next.js) fails the build, and its
 * `snapshot` is `undefined` in any case. `manifest.d.ts` types
 * `manifest.js`.
 *
 * Without a snapshot, `manifest.js` exports `undefined`, so imports still
 * compile and the server fetches the manifest at runtime. A failure in
 * `'fail'` mode leaves the files untouched. An unchanged file is not
 * rewritten.
 *
 * @param options - Backend URL and `onBuildError`.
 * @param defaults - Framework label, type import, app root, command,
 * backend URL variables, and why the framework cannot use a snapshot.
 * @param logger - Receives skip notices and warnings, without the label.
 * @returns The absolute paths of the server and browser modules.
 * @throws {Error} When the fetch fails in `'fail'` mode, or a file cannot be
 * written.
 * @internal
 */
export const writeManifestCacheModule = async (
	options: ManifestBuildOptions,
	defaults: {
		command: ManifestBuildCommand;
		envNames?: readonly string[];
		importSource: string;
		label: string;
		rootDir?: string;
		skipReason?: string;
	},
	logger: ManifestBuildLogger = labelledBuildLogger(defaults.label)
): Promise<ManifestCacheFiles> => {
	const snapshot = await loadManifestForBuild(
		{ backendURL: options.backendURL, fetch: options.fetch },
		{
			command: defaults.command,
			envNames: defaults.envNames,
			label: defaults.label,
			logger,
			onBuildError: options.onBuildError,
			skipReason: defaults.skipReason,
		}
	);
	const directory = resolve(
		defaults.rootDir ?? process.cwd(),
		MANIFEST_CACHE_DIR
	);
	const module = { backendURL: options.backendURL, snapshot };
	const [server, browser] = await Promise.all([
		writeModuleFile(
			join(directory, 'manifest.js'),
			renderGeneratedModule(module)
		),
		writeModuleFile(
			join(directory, 'manifest.browser.js'),
			renderGeneratedModule(module, { clientStub: true, serverOnly: true })
		),
		writeModuleFile(
			join(directory, 'manifest.d.ts'),
			renderGeneratedDeclarations(defaults.importSource)
		),
	]);
	return { browser, server };
};

/** The slice of Vite's resolved config the manifest plugin reads. */
export interface ManifestPluginConfig {
	command?: 'build' | 'serve';
	env?: Record<string, unknown>;
	envDir?: string | false;
	logger?: ManifestBuildLogger;
	mode?: string;
	plugins?: readonly { name: string }[];
	root: string;
}

/** The slice of a Vite plugin context `load` reads. */
export interface ManifestPluginContext {
	environment?: { config?: { consumer?: 'client' | 'server' } };
}

/**
 * The Vite plugin each `consentManifest()` returns, typed structurally so it
 * fits the `plugins` array of every supported Vite version.
 */
export interface ConsentManifestPlugin {
	apply: (config: unknown, environment: { isPreview?: boolean }) => boolean;
	config: () => {
		optimizeDeps: { exclude: string[] };
		ssr: { noExternal: string[] };
	};
	configResolved: (config: ManifestPluginConfig) => void;
	enforce: 'pre';
	load: (
		this: ManifestPluginContext | undefined,
		id: string,
		options?: { ssr?: boolean }
	) => Promise<string | undefined>;
	name: string;
	renderChunk: (code: string) => Promise<{ code: string; map: null } | null>;
	resolveId: (id: string) => string | undefined;
}

/**
 * Logged when a single-page app bundles a policy that depends on where the
 * visitor is. The browser doesn't know that, so `manifest()` asks the
 * backend's `/init` anyway unless the page supplies a location.
 */
const LOCATION_ADVICE =
	"the consent policy depends on the visitor's location, which the browser doesn't know. Unless you pass `inputs` or `geoURL` to `manifest()`, every first visit still calls the backend's /init, so the bundled policy adds bytes without saving a request. Consider `mode: hosted()` instead.";

/** The resolved id of the virtual `@c15t/core/generated` module. */
const VIRTUAL_GENERATED_ID = '\0@c15t/core/generated';

/**
 * Stand-ins a production build gives the generated module's exports until
 * tree-shaking has decided which ones the bundle reads. A pure call keeps
 * an unread export removable and stops the bundler from folding the value.
 */
const PLACEHOLDERS = {
	backendURL: '__c15t_build_backend_url__',
	snapshot: '__c15t_build_snapshot__',
} as const;

const placeholderExpression = (token: string): string =>
	`/* @__PURE__ */ Object(${JSON.stringify(token)})`;

/** Matches a stand-in after the bundler rendered it, comment or not. */
const placeholderPattern = (token: string): RegExp =>
	new RegExp(
		`(?:/\\*\\s*[#@]__PURE__\\s*\\*/\\s*)?Object\\(\\s*(["'\`])${token}\\1\\s*\\)`,
		'gu'
	);

/**
 * Packages whose modules can import `@c15t/core/generated`. Server builds
 * bundle them, so the import reaches the plugin instead of Node.
 */
const GENERATED_IMPORTERS = [
	'c15t',
	'@c15t/browser',
	'@c15t/core',
	'@c15t/react',
	'@c15t/svelte',
	'@c15t/tanstack-start',
	'@c15t/vue',
];

/**
 * Builds the Vite plugin behind each `consentManifest` export. It serves
 * the virtual `@c15t/core/generated` module, so no file is written into the
 * app. Preview uses the existing build. Without `backendURL`, the first of
 * `envNames` that is set supplies it; a `VITE_` variable left unset is then
 * set to the URL used, so app code reads the same value.
 *
 * The manifest is fetched only for a bundle that reads `snapshot`, which
 * `hosted()` and `offline()` never do. The mode is chosen in app code, so
 * the plugin cannot know it from the Vite config:
 *
 * - `vite build` gives the exports stand-ins and fills them in after
 *   tree-shaking, in `renderChunk`. A chunk that still contains the
 *   snapshot triggers the fetch, under the build policy. A chunk that
 *   reads `backendURL` when none is set gets the missing-URL policy.
 * - `vite dev` fetches when the module is first loaded, under the dev
 *   policy. Dev has no tree-shaking, so this also happens for a `hosted()`
 *   app; dev only warns.
 *
 * A failed fetch can be retried.
 *
 * In a server-rendered framework, the client environment's module exports
 * `snapshot: undefined`, so the snapshot never reaches the browser bundle.
 * `backendURL` is public and reaches every environment.
 *
 * The plugin keeps the virtual module out of dependency pre-bundling and
 * bundles the c15t packages in server builds, so a c15t package can import
 * `@c15t/core/generated` as app code does.
 *
 * @param options - Backend URL and `onBuildError`.
 * @param defaults - Framework label, backend URL variables, and whether the
 * framework renders on the server (a function receives the resolved config).
 * @returns The Vite plugin.
 * @internal
 */
export const createConsentManifestPlugin = (
	options: ManifestBuildOptions,
	defaults: {
		envNames: readonly string[];
		label: string;
		serverRendered?: boolean | ((config: ManifestPluginConfig) => boolean);
		/**
		 * Warn when the snapshot's policy depends on the visitor's location,
		 * which a single-page app's `manifest()` can't resolve on its own.
		 */
		adviseHostedForLocation?: boolean;
	}
): ConsentManifestPlugin => {
	let resolved: ManifestPluginConfig | undefined;
	let backendURL: string | undefined;
	let serverRendered = false;
	let generation: Promise<ConsentManifest | undefined> | undefined;
	let missingURLReported = false;
	const command = (): ManifestBuildCommand =>
		resolved?.command === 'serve' ? 'dev' : 'build';
	const logger = (): ManifestBuildLogger =>
		labelledBuildLogger(defaults.label, resolved?.logger);
	const policy = (): ManifestBuildPolicy => ({
		command: command(),
		envNames: defaults.envNames,
		label: defaults.label,
		logger: logger(),
		onBuildError: options.onBuildError,
	});
	const fetchSnapshot = async (): Promise<ConsentManifest | undefined> => {
		try {
			const snapshot = await loadManifestForBuild(
				{ backendURL, fetch: options.fetch },
				policy()
			);
			// Only a build knows the bundle uses `manifest()`: dev loads the
			// module for every mode.
			if (
				defaults.adviseHostedForLocation &&
				!serverRendered &&
				command() === 'build' &&
				snapshot &&
				manifestNeedsLocation(snapshot)
			) {
				logger().warn(LOCATION_ADVICE);
			}
			return snapshot;
		} catch (error) {
			generation = undefined;
			throw error;
		}
	};
	const loadSnapshot = (): Promise<ConsentManifest | undefined> => {
		generation ??= fetchSnapshot();
		return generation;
	};
	/**
	 * A bundle reads `backendURL` but none is set: `hosted()` or
	 * `manifest()` without their own URL. Warns once rather than failing,
	 * because a mode that passes its own `backendURL` still reads the
	 * build's as its default; one that does not throws when the app starts.
	 * A bundle that also reads the snapshot was already reported by its
	 * fetch.
	 */
	const reportMissingBackendURL = (): void => {
		if (missingURLReported) {
			return;
		}
		missingURLReported = true;
		logger().warn(
			`no backend URL is set. \`hosted()\` and \`manifest()\` without their own \`backendURL\` throw when the app starts. Pass backendURL to the plugin or set ${defaults.envNames.join(' or ')}.`
		);
	};
	return {
		apply: (_config: unknown, environment: { isPreview?: boolean }) =>
			!environment.isPreview,
		config: () => ({
			optimizeDeps: { exclude: [...GENERATED_MODULE_IDS] },
			ssr: { noExternal: [...GENERATED_IMPORTERS] },
		}),
		configResolved: (config: ManifestPluginConfig) => {
			resolved = config;
			// An unknown `onBuildError` is a setup mistake: report it now, not
			// only when a bundle reads the snapshot.
			resolveManifestBuildErrorMode(
				options.onBuildError,
				command(),
				defaults.label
			);
			const { serverRendered: rendered = false } = defaults;
			serverRendered =
				typeof rendered === 'function' ? rendered(config) : rendered;
			const envRoot =
				typeof config.envDir === 'string' ? config.envDir : config.root;
			backendURL =
				options.backendURL ??
				readBuildEnv(defaults.envNames, {
					env: config.env,
					mode: config.mode,
					root: envRoot,
				});
			const exposed = defaults.envNames.find((name) =>
				name.startsWith('VITE_')
			);
			if (
				backendURL &&
				exposed &&
				config.env &&
				config.env[exposed] === undefined
			) {
				config.env[exposed] = backendURL;
			}
		},
		enforce: 'pre' as const,
		async load(
			this: ManifestPluginContext | undefined,
			id: string,
			loadOptions?: { ssr?: boolean }
		): Promise<string | undefined> {
			if (id !== VIRTUAL_GENERATED_ID) {
				return undefined;
			}
			if (!resolved) {
				throw new Error(
					`${defaults.label}: Vite loaded ${GENERATED_MODULE_IDS[0]} before the plugin read its configuration.`
				);
			}
			const consumer =
				this?.environment?.config?.consumer ??
				(loadOptions?.ssr ? 'server' : 'client');
			const clientStub = serverRendered && consumer === 'client';
			if (command() === 'dev') {
				return renderGeneratedModule(
					{
						backendURL,
						snapshot: clientStub ? undefined : await loadSnapshot(),
					},
					{ clientStub }
				);
			}
			const lines = [
				'// Written by the c15t build integration. Do not edit.',
				'// The build fills in what the bundle still reads after tree-shaking.',
				`export const backendURL = ${
					backendURL === undefined
						? placeholderExpression(PLACEHOLDERS.backendURL)
						: JSON.stringify(backendURL)
				};`,
				clientStub
					? '// The snapshot stays on the server; the browser bundle never gets it.\nexport const snapshot = undefined;'
					: `export const snapshot = ${placeholderExpression(PLACEHOLDERS.snapshot)};`,
				'',
			];
			return lines.join('\n');
		},
		name: 'c15t:consent-manifest',
		async renderChunk(code: string) {
			const readsSnapshot = code.includes(PLACEHOLDERS.snapshot);
			const readsBackendURL = code.includes(PLACEHOLDERS.backendURL);
			if (!(readsSnapshot || readsBackendURL)) {
				return null;
			}
			let rendered = code;
			if (readsSnapshot) {
				const snapshot = await loadSnapshot();
				// One line, so the chunk's line mappings stay valid.
				rendered = rendered.replace(
					placeholderPattern(PLACEHOLDERS.snapshot),
					snapshot ? `(${JSON.stringify(snapshot)})` : 'void 0'
				);
			}
			if (readsBackendURL) {
				if (!readsSnapshot) {
					reportMissingBackendURL();
				}
				rendered = rendered.replace(
					placeholderPattern(PLACEHOLDERS.backendURL),
					'void 0'
				);
			}
			if (
				Object.values(PLACEHOLDERS).some((token) => rendered.includes(token))
			) {
				throw new Error(
					`${defaults.label}: the bundler rewrote the ${GENERATED_MODULE_IDS[0]} stand-ins, so the build cannot fill them in.`
				);
			}
			return { code: rendered, map: null };
		},
		resolveId: (id: string): string | undefined =>
			(GENERATED_MODULE_IDS as readonly string[]).includes(id)
				? VIRTUAL_GENERATED_ID
				: undefined,
	};
};

/**
 * Serves the deployment's consent manifest as `@c15t/core/generated`, for
 * single-page apps (React, Solid, plain JavaScript). Import `snapshot` from
 * there; no file is written into the app. The manifest is fetched only when
 * the bundle reads `snapshot`, as `manifest()` does, so `hosted()` and
 * `offline()` builds never depend on the backend.
 *
 * A failed fetch stops `vite build` and warns in `vite dev`, where
 * `snapshot` is `undefined`. Set `onBuildError` or `C15T_ON_BUILD_ERROR` to
 * change that. When the policy depends on the visitor's location, it warns
 * and suggests `hosted()`, since the browser's `manifest()` then still asks
 * the backend's `/init` unless the page passes `inputs` or `geoURL`.
 *
 * @param options - Backend URL and `onBuildError`. `backendURL` defaults to
 * `VITE_C15T_BACKEND_URL`.
 * @returns A Vite plugin, compatible with React, Vue, Svelte and Solid builds.
 * @throws {Error} When the fetch fails in `'fail'` mode, stopping Vite.
 * @example
 * ```ts
 * import { consentManifest } from 'c15t/build';
 * // Reads VITE_C15T_BACKEND_URL, for example from `.env`.
 * export default { plugins: [consentManifest()] };
 * ```
 */
export const consentManifest = (
	options: ManifestBuildOptions = {}
): ConsentManifestPlugin =>
	createConsentManifestPlugin(options, {
		adviseHostedForLocation: true,
		envNames: ['VITE_C15T_BACKEND_URL'],
		label: '@c15t/core/build',
	});
