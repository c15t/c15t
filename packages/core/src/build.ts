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
 * Runs once per plugin instance during build or development configuration.
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
	return {
		configResolved: async (config: { root: string }) => {
			generation ??= writeManifestModule(options, {
				importSource: 'c15t/build',
				label: '@c15t/core/build',
				outputFile: 'src/c15t-manifest.ts',
				rootDir: config.root,
			});
			await generation;
		},
		enforce: 'pre' as const,
		name: 'c15t:consent-manifest',
	};
};
