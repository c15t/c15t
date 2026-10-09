/**
 * `@c15t/svelte/vite` — build-time help for SvelteKit apps.
 *
 * The provider loads the script loader and the network blocker on demand,
 * as one chunk. {@link c15tPreload} lets `c15tHandle` preload it on the
 * pages that configure `scripts` or blocker rules, so it arrives with the
 * app's code instead of one round trip after it.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createConsentManifestPlugin } from '@c15t/core/build';
import type { ManifestBuildOptions } from '@c15t/core/build';

// With its extension: Node loads this file straight from `dist`, unbundled.
import { MODULE_PRELOAD_PLACEHOLDERS } from './kit/module-preload.js';
import type { PreloadChunkName } from './kit/module-preload.js';

export type {
	ConsentManifest,
	ManifestBuildErrorMode,
	ManifestBuildOptions,
} from '@c15t/core/build';

/**
 * Generates a manifest before Svelte or SvelteKit compilation.
 *
 * `backendURL` defaults to `PUBLIC_C15T_BACKEND_URL` (SvelteKit), then
 * `VITE_C15T_BACKEND_URL`, including `.env` files. A failed fetch stops
 * `vite build` and warns in `vite dev`, where the generated module exports
 * `undefined`. Set `onBuildError` or `C15T_ON_BUILD_ERROR` to change that.
 *
 * @param options - Backend URL and generated module settings. Appends `/manifest`.
 * @returns A Vite plugin using `@c15t/svelte/vite` for its type import.
 * @throws {Error} When the fetch fails in `'fail'` mode, the default for
 * `vite build`, or the file cannot be written.
 */
export const consentManifest = (options: ManifestBuildOptions = {}) =>
	createConsentManifestPlugin(options, {
		envNames: ['PUBLIC_C15T_BACKEND_URL', 'VITE_C15T_BACKEND_URL'],
		importSource: '@c15t/svelte/vite',
		label: '@c15t/svelte/vite',
	});

/** The `@c15t/core` module each on-demand chunk starts from. */
const CHUNK_MODULES: Readonly<Record<PreloadChunkName, RegExp>> = {
	'loader-and-blocker':
		/[\\/](?:@c15t[\\/]core|packages[\\/]core)[\\/](?:dist|src)[\\/]modules[\\/]loader-and-blocker\.[cm]?[jt]s$/u,
};

const CHUNK_NAMES = Object.keys(CHUNK_MODULES) as PreloadChunkName[];

/** The slice of a Rollup/Rolldown output chunk this plugin reads. */
interface OutputChunkLike {
	fileName: string;
	isEntry: boolean;
	moduleIds?: readonly string[];
	modules?: Readonly<Record<string, unknown>>;
	type: 'chunk';
}

/** The slice of SvelteKit's validated `kit` config this plugin reads. */
interface KitConfigLike {
	outDir?: string;
	paths?: { assets?: string; base?: string };
}

/** The slice of Vite's resolved config this plugin reads. */
interface ResolvedConfigLike {
	build: { ssr?: unknown };
	plugins: readonly { api?: unknown; name: string }[];
	root: string;
}

/**
 * The Vite plugin {@link c15tPreload} returns, typed structurally so it
 * fits the `plugins` array of every Vite version SvelteKit supports.
 */
export interface C15tPreloadPlugin {
	apply: 'build';
	configResolved: (config: ResolvedConfigLike) => void;
	name: string;
	writeBundle: (
		this: { environment?: { name: string } },
		options: unknown,
		bundle: Record<string, { type: string }>
	) => Promise<void>;
}

/**
 * Each on-demand chunk's URL in a client build, or `''` for one the build
 * put in an entry chunk (the page loads it anyway) or left out.
 *
 * @param bundle - The client build's output.
 * @param base - Where the client output is served from (`paths.assets`,
 * else `paths.base`).
 * @returns The URL per chunk name.
 * @internal
 */
export const resolveChunkHrefs = function resolveChunkHrefs(
	bundle: Record<string, { type: string }>,
	base: string
): Record<PreloadChunkName, string> {
	const hrefs: Record<PreloadChunkName, string> = { 'loader-and-blocker': '' };
	for (const output of Object.values(bundle)) {
		if (output.type !== 'chunk') {
			continue;
		}
		const chunk = output as OutputChunkLike;
		const ids = chunk.moduleIds ?? Object.keys(chunk.modules ?? {});
		for (const name of CHUNK_NAMES) {
			if (ids.some((id) => CHUNK_MODULES[name].test(id))) {
				hrefs[name] = chunk.isEntry ? '' : `${base}/${chunk.fileName}`;
			}
		}
	}
	return hrefs;
};

/** Every `.js`/`.mjs` file under a directory. */
const listScripts = async function listScripts(
	directory: string
): Promise<string[]> {
	let entries;
	try {
		entries = await readdir(directory, { recursive: true });
	} catch {
		return [];
	}
	return entries
		.filter((entry) => /\.m?js$/u.test(entry))
		.map((entry) => path.join(directory, entry));
};

/**
 * Write each chunk URL over its placeholder in every server file that has
 * one.
 *
 * @param serverDirectory - SvelteKit's server output.
 * @param hrefs - The URL per chunk name; `''` drops the link.
 * @returns The files changed.
 * @internal
 */
export const writeChunkHrefs = async function writeChunkHrefs(
	serverDirectory: string,
	hrefs: Readonly<Record<PreloadChunkName, string>>
): Promise<string[]> {
	const files = await listScripts(serverDirectory);
	const changed = await Promise.all(
		files.map(async (file) => {
			const source = await readFile(file, 'utf8');
			let next = source;
			for (const name of CHUNK_NAMES) {
				next = next.replaceAll(MODULE_PRELOAD_PLACEHOLDERS[name], hrefs[name]);
			}
			if (next === source) {
				return null;
			}
			await writeFile(file, next);
			return file;
		})
	);
	return changed.filter((file): file is string => file !== null);
};

/**
 * Vite plugin that tells `c15tHandle` where the client build put the
 * chunk that holds the script loader and the network blocker.
 *
 * SvelteKit builds the server first, so the server cannot know client
 * chunk names. After the client build writes its chunks, this plugin
 * writes their URLs into the server output, before SvelteKit prerenders
 * and before an adapter copies it. `c15tHandle` then adds a
 * `<link rel="modulepreload">` for that chunk to every page whose provider
 * has non-empty `scripts` or blocker rules. Pages without either get no
 * link and never fetch the chunk.
 *
 * Only builds are affected. Outside SvelteKit (a Vite single-page app)
 * the plugin does nothing: there is no server render to put a link in.
 *
 * @returns The Vite plugin.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { c15tPreload } from '@c15t/svelte/vite';
 * import { sveltekit } from '@sveltejs/kit/vite';
 *
 * export default { plugins: [sveltekit(), c15tPreload()] };
 * ```
 */
export const c15tPreload = function c15tPreload(): C15tPreloadPlugin {
	let kit: KitConfigLike | undefined;
	// Empty resolves against the working directory, as Vite does.
	let root = '';
	let ssr = false;
	return {
		apply: 'build',
		configResolved(config) {
			({ root } = config);
			ssr = Boolean(config.build.ssr);
			const setup = config.plugins.find(
				(plugin) => plugin.name === 'vite-plugin-sveltekit-setup'
			);
			// SvelteKit 2 nests its options under `kit` (svelte.config.js);
			// SvelteKit 3 takes them flat, from `sveltekit({ ... })`.
			const options = (
				setup?.api as
					| { options?: KitConfigLike & { kit?: KitConfigLike } }
					| undefined
			)?.options;
			kit = options?.kit ?? options;
		},
		name: 'c15t:module-preload',
		async writeBundle(_options, bundle) {
			// SvelteKit 3 builds every environment with one plugin instance;
			// SvelteKit 2 starts a separate client build.
			const client = this.environment
				? this.environment.name === 'client'
				: !ssr;
			if (!kit || !client) {
				return;
			}
			const { assets = '', base = '' } = kit.paths ?? {};
			await writeChunkHrefs(
				path.resolve(root, kit.outDir ?? '.svelte-kit', 'output', 'server'),
				resolveChunkHrefs(bundle, assets || base)
			);
		},
	};
};
