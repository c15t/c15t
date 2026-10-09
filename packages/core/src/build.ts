/** Node-only manifest generation for framework build integrations. */
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
 * Longest a default build waits for the manifest, in milliseconds. A runner
 * without network access then falls back to runtime fetching instead of
 * holding the build.
 */
const DEFAULT_BUILD_MANIFEST_TIMEOUT_MS = 10_000;

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
 * Loads the snapshot a framework integration fetches by default. Unlike
 * {@link loadBuildManifest}, it never stops the build: without an absolute
 * upstream URL it skips the fetch, and when the fetch fails or times out it
 * warns. Either way the caller falls back to fetching at runtime.
 * @param options - Manifest URL, or backend URL whose `/manifest` is read.
 * @param label - Framework name for messages.
 * @param warn - Receives the failure, without the label.
 * @param strictOption - The option the warning suggests to make a failed
 * fetch stop the build.
 * @returns The deployment's manifest, or `undefined` to fetch at runtime.
 * @internal
 */
export const loadDefaultBuildManifest = async (
	options: {
		backendURL?: string;
		manifestURL?: string;
		fetch?: typeof globalThis.fetch;
	},
	label: string,
	warn: (message: string) => void,
	strictOption = '`buildManifest: true`'
): Promise<ConsentManifest | undefined> => {
	if (!hasBuildManifestSource(options)) {
		return undefined;
	}
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	try {
		return await loadBuildManifest(
			{
				...options,
				fetch:
					fetchImpl &&
					((input, init) =>
						fetchImpl(input, {
							...init,
							signal: AbortSignal.timeout(DEFAULT_BUILD_MANIFEST_TIMEOUT_MS),
						})),
			},
			label
		);
	} catch (error) {
		const prefix = `${label}: `;
		let reason = error instanceof Error ? error.message : String(error);
		if (reason.startsWith(prefix)) {
			reason = reason.slice(prefix.length);
		}
		// A network error is a bare `fetch failed`; the useful part, such as
		// ECONNREFUSED, is in its cause.
		if (error instanceof TypeError && error.cause instanceof Error) {
			reason = `${reason}: ${error.cause.message}`;
		}
		warn(
			`could not fetch the consent manifest during the build (${reason}). The server fetches it at runtime instead. Set ${strictOption} to stop the build when this fetch fails.`
		);
		return undefined;
	}
};

/** Options for generating a deployment's manifest before compilation. */
export interface ManifestBuildOptions extends Omit<
	StaticManifestModuleOptions,
	'manifestURL'
> {
	/** Absolute backend base URL. The build appends `/manifest`. */
	backendURL: string;
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
 * What a build does when it cannot fetch the manifest. `'runtime'` logs a
 * warning, writes a module that exports `undefined` and lets the server fetch
 * the manifest at runtime. `'fail'` stops the build.
 */
export type ManifestBuildErrorMode = 'runtime' | 'fail';

/** Build options for integrations that can fall back to runtime fetching. */
export interface ManifestBuildFallbackOptions extends ManifestBuildOptions {
	/**
	 * What to do when the build cannot fetch the manifest. `'runtime'` logs a
	 * warning, and the server fetches the policy at runtime. `'fail'` stops
	 * the build, and also rejects a `backendURL` that is not absolute http(s).
	 *
	 * @default 'runtime'
	 */
	onBuildError?: ManifestBuildErrorMode;
}

/** Where a build reports a skipped or failed manifest fetch. */
export interface ManifestBuildLogger {
	info: (message: string) => void;
	warn: (message: string) => void;
}

const consoleLogger: ManifestBuildLogger = {
	info: (message) => console.info(message),
	warn: (message) => console.warn(message),
};

/**
 * Writes the generated manifest module as `onBuildError` asks.
 *
 * `'runtime'` (the default) skips the fetch when `backendURL` is not
 * absolute http(s), waits at most 10 seconds for it, and turns a failure
 * into a warning. When it has no snapshot it writes a module whose export is
 * `undefined`, so imports still compile and the server fetches the manifest
 * at runtime. `'fail'` behaves like {@link writeManifestModule}. A
 * `skipReason` from the framework, such as a static export, skips the fetch
 * in both modes.
 *
 * @param options - Backend URL, module settings and `onBuildError`.
 * @param defaults - Framework label, type import, output location, and why
 * the framework cannot use a snapshot, if it can't.
 * @param logger - Receives skip notices and fetch warnings.
 * @returns The absolute path of the generated module.
 * @throws {Error} With `'fail'`, when generation fails. In both modes, when
 * `onBuildError`, the export name or the import source is invalid, or the
 * file cannot be written.
 * @internal
 */
export const writeManifestModuleWithFallback = async (
	options: ManifestBuildFallbackOptions,
	defaults: {
		importSource: string;
		label: string;
		outputFile: string;
		rootDir?: string;
		skipReason?: string;
	},
	logger: ManifestBuildLogger = consoleLogger
): Promise<string> => {
	const { label } = defaults;
	const mode = options.onBuildError ?? 'runtime';
	if (mode !== 'runtime' && mode !== 'fail') {
		throw new Error(
			`${label}: onBuildError must be 'runtime' or 'fail', received ${JSON.stringify(mode)}.`
		);
	}
	const names = resolveStaticManifestModuleNames(options, defaults);
	let { skipReason } = defaults;
	if (!skipReason && mode === 'fail') {
		return await writeManifestModule(options, defaults);
	}
	if (!(skipReason || hasBuildManifestSource(options))) {
		skipReason = `backendURL ${JSON.stringify(options.backendURL)} is not an absolute http(s) URL, so the server fetches the policy at runtime`;
	}
	let manifest: ConsentManifest | undefined;
	if (skipReason) {
		logger.info(
			`${label}: skipped the consent manifest fetch because ${skipReason}.`
		);
	} else {
		manifest = await loadDefaultBuildManifest(
			{ backendURL: options.backendURL, fetch: options.fetch },
			label,
			(message) => logger.warn(`${label}: ${message}`),
			"`onBuildError: 'fail'`"
		);
	}
	return await writeModuleFile(
		resolveOutputFile(options, defaults),
		renderStaticManifestModule(names, manifest)
	);
};

/**
 * Builds the Vite plugin behind each `consentManifest` export. One
 * generation is shared across configuration resolution, and a failed one can
 * be retried. Preview uses the existing build.
 * @param options - Backend URL, module settings and `onBuildError`.
 * @param defaults - Framework label and type import.
 * @returns The Vite plugin.
 * @internal
 */
export const createConsentManifestPlugin = (
	options: ManifestBuildFallbackOptions,
	defaults: { importSource: string; label: string }
) => {
	let generation: Promise<string> | undefined;
	const generateManifest = async (
		rootDir: string,
		logger: ManifestBuildLogger | undefined
	): Promise<string> => {
		try {
			return await writeManifestModuleWithFallback(
				options,
				{ ...defaults, outputFile: 'src/c15t-manifest.ts', rootDir },
				logger
			);
		} catch (error) {
			generation = undefined;
			throw error;
		}
	};
	return {
		apply: (_config: unknown, environment: { isPreview?: boolean }) =>
			!environment.isPreview,
		configResolved: async (config: {
			logger?: ManifestBuildLogger;
			root: string;
		}) => {
			generation ??= generateManifest(config.root, config.logger);
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
 * @param options - Backend URL and output settings. Defaults to
 * `src/c15t-manifest.ts`, with its type imported from `c15t/build`.
 * @returns A Vite plugin, compatible with React, Vue, Svelte and Solid builds.
 * @throws {Error} When generation fails, stopping the build.
 * @example
 * ```ts
 * import { consentManifest } from 'c15t/build';
 * export default { plugins: [consentManifest({
 *   backendURL: 'https://your-project.inth.app',
 * })] };
 * ```
 */
export const consentManifest = (options: ManifestBuildOptions) =>
	createConsentManifestPlugin(
		{ ...options, onBuildError: 'fail' },
		{ importSource: 'c15t/build', label: '@c15t/core/build' }
	);
