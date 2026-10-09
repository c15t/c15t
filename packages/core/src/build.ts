/** Node-only manifest generation for framework build integrations. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import type { ConsentManifest } from '@c15t/schema/types';

import {
	createStaticManifestModule,
	loadStaticManifest,
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
	warn: (message: string) => void
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
		warn(
			`could not fetch the consent manifest during the build (${reason}). The server fetches it at runtime instead. Set \`buildManifest: true\` to stop the build when this fetch fails.`
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
	const outputFile = resolve(
		options.rootDir ?? defaults.rootDir ?? process.cwd(),
		options.outputFile ?? defaults.outputFile
	);
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
export const consentManifest = (options: ManifestBuildOptions) => {
	let generation: Promise<string> | undefined;
	const generateManifest = async (rootDir: string): Promise<string> => {
		try {
			return await writeManifestModule(options, {
				importSource: 'c15t/build',
				label: '@c15t/core/build',
				outputFile: 'src/c15t-manifest.ts',
				rootDir,
			});
		} catch (error) {
			generation = undefined;
			throw error;
		}
	};
	return {
		apply: (_config: unknown, environment: { isPreview?: boolean }) =>
			!environment.isPreview,
		configResolved: async (config: { root: string }) => {
			generation ??= generateManifest(config.root);
			await generation;
		},
		enforce: 'pre' as const,
		name: 'c15t:consent-manifest',
	};
};
