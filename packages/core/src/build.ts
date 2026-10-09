/** Node-only manifest generation for framework build integrations. */
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import type { ConsentManifest } from '@c15t/schema/types';

import {
	createStaticManifestModule,
	loadStaticManifest,
	renderStaticManifestModule,
	resolveStaticManifestModuleNames,
} from './server/static-manifest';
import type { StaticManifestModuleOptions } from './server/static-manifest';

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

/** Options for generating a deployment's manifest before compilation. */
export interface ManifestBuildOptions extends Omit<
	StaticManifestModuleOptions,
	'manifestURL'
> {
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
	/** Generated TypeScript file, relative to the application root. */
	outputFile?: string;
	/** Application root. Defaults to the framework root or current directory. */
	rootDir?: string;
}

const resolveOutputFile = (
	options: Pick<ManifestBuildOptions, 'outputFile' | 'rootDir'>,
	defaults: { outputFile: string; rootDir?: string }
): string =>
	resolve(
		options.rootDir ?? defaults.rootDir ?? process.cwd(),
		options.outputFile ?? defaults.outputFile
	);

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

/**
 * Fetches and writes a typed manifest module before the application builds.
 * An unchanged snapshot is not rewritten, so file watchers stay quiet.
 *
 * @param options - Backend URL and generated module options.
 * @param defaults - Framework label, type import and output location.
 * @returns The absolute path of the generated module.
 * @throws {Error} When generation or writing fails. Never reuses an old file.
 * @internal
 */
export const writeManifestModule = async (
	options: ManifestBuildOptions,
	defaults: {
		importSource: string;
		label: string;
		outputFile: string;
		rootDir?: string;
	}
): Promise<string> => {
	const source = await createStaticManifestModule(
		{
			...options,
			manifestURL: resolveBuildManifestURL(
				{ backendURL: options.backendURL },
				defaults.label
			),
		},
		defaults
	);
	return await writeModuleFile(resolveOutputFile(options, defaults), source);
};

/**
 * Writes the generated manifest module under the policy of
 * {@link loadManifestForBuild}. Without a snapshot, the module's export is
 * `undefined`, so imports still compile and the server fetches the manifest
 * at runtime. A failure in `'fail'` mode leaves the file untouched.
 *
 * @param options - Backend URL, module settings and `onBuildError`.
 * @param defaults - Framework label, type import, output location, command,
 * backend URL variables, and why the framework cannot use a snapshot.
 * @param logger - Receives skip notices and warnings, without the label.
 * @returns The absolute path of the generated module.
 * @throws {Error} When the fetch fails in `'fail'` mode, the export name or
 * import source is invalid, or the file cannot be written.
 * @internal
 */
export const writeManifestModuleWithFallback = async (
	options: ManifestBuildOptions,
	defaults: {
		command: ManifestBuildCommand;
		envNames?: readonly string[];
		importSource: string;
		label: string;
		outputFile: string;
		rootDir?: string;
		skipReason?: string;
	},
	logger: ManifestBuildLogger = labelledBuildLogger(defaults.label)
): Promise<string> => {
	const names = resolveStaticManifestModuleNames(options, defaults);
	const manifest = await loadManifestForBuild(
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
	return await writeModuleFile(
		resolveOutputFile(options, defaults),
		renderStaticManifestModule(names, manifest)
	);
};

/** The slice of Vite's resolved config the manifest plugin reads. */
export interface ManifestPluginConfig {
	command?: 'build' | 'serve';
	env?: Record<string, unknown>;
	envDir?: string | false;
	logger?: ManifestBuildLogger;
	mode?: string;
	root: string;
}

/**
 * Builds the Vite plugin behind each `consentManifest` export. One
 * generation is shared across configuration resolution, and a failed one can
 * be retried. Preview uses the existing build. `vite build` follows the
 * build policy, `vite dev` the dev policy. Without `backendURL`, the first of
 * `envNames` that is set supplies it; a `VITE_` variable left unset is then
 * set to the URL used, so app code reads the same value.
 * @param options - Backend URL, module settings and `onBuildError`.
 * @param defaults - Framework label, type import and backend URL variables.
 * @returns The Vite plugin.
 * @internal
 */
export const createConsentManifestPlugin = (
	options: ManifestBuildOptions,
	defaults: {
		envNames: readonly string[];
		importSource: string;
		label: string;
	}
) => {
	let generation: Promise<string> | undefined;
	const generateManifest = async (
		config: ManifestPluginConfig
	): Promise<string> => {
		const envRoot =
			typeof config.envDir === 'string' ? config.envDir : config.root;
		const backendURL =
			options.backendURL ??
			readBuildEnv(defaults.envNames, {
				env: config.env,
				mode: config.mode,
				root: envRoot,
			});
		const exposed = defaults.envNames.find((name) => name.startsWith('VITE_'));
		if (
			backendURL &&
			exposed &&
			config.env &&
			config.env[exposed] === undefined
		) {
			config.env[exposed] = backendURL;
		}
		try {
			return await writeManifestModuleWithFallback(
				{ ...options, backendURL },
				{
					...defaults,
					command: config.command === 'serve' ? 'dev' : 'build',
					outputFile: 'src/c15t-manifest.ts',
					rootDir: config.root,
				},
				labelledBuildLogger(defaults.label, config.logger)
			);
		} catch (error) {
			generation = undefined;
			throw error;
		}
	};
	return {
		apply: (_config: unknown, environment: { isPreview?: boolean }) =>
			!environment.isPreview,
		configResolved: async (config: ManifestPluginConfig) => {
			generation ??= generateManifest(config);
			await generation;
		},
		enforce: 'pre' as const,
		name: 'c15t:consent-manifest',
	};
};

/**
 * Generates a typed manifest before any Vite framework compiles its app.
 * Shares a successful snapshot across build or development configuration.
 * Failed generation can be retried. Preview uses the existing build.
 * Import the generated `consentManifest` into the app's consent setup.
 *
 * A failed fetch stops `vite build` and warns in `vite dev`, where the
 * generated module exports `undefined`. Set `onBuildError` or
 * `C15T_ON_BUILD_ERROR` to change that.
 *
 * @param options - Backend URL and output settings. `backendURL` defaults to
 * `VITE_C15T_BACKEND_URL`. The file defaults to `src/c15t-manifest.ts`,
 * with its type imported from `c15t/build`.
 * @returns A Vite plugin, compatible with React, Vue, Svelte and Solid builds.
 * @throws {Error} When generation fails in `'fail'` mode, stopping Vite.
 * @example
 * ```ts
 * import { consentManifest } from 'c15t/build';
 * // Reads VITE_C15T_BACKEND_URL, for example from `.env`.
 * export default { plugins: [consentManifest()] };
 * ```
 */
export const consentManifest = (options: ManifestBuildOptions = {}) =>
	createConsentManifestPlugin(options, {
		envNames: ['VITE_C15T_BACKEND_URL'],
		importSource: 'c15t/build',
		label: '@c15t/core/build',
	});
