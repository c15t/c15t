import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * `consentManifest()` lets `c15tHandle` preload the on-demand script loader
 * and network blocker chunks on the routes that configure them. The bench
 * has no backend to fetch a manifest from at build time (its fixture is
 * this app), so `onBuildError: 'runtime'` skips the fetch and the server
 * reads the fixture's manifest at runtime.
 *
 * The benchmark runner builds this app against older base revisions too,
 * and `@c15t/svelte/vite` does not exist there. Vite bundles this config
 * before running it and inlines workspace packages, so a literal
 * `import('@c15t/svelte/vite')` fails at bundle time, before any `catch`
 * can run. A computed specifier stays a runtime import: Node resolves it
 * from this directory, and a missing export becomes a rejection the
 * fallback below can handle.
 */
const loadC15tPlugins = async function loadC15tPlugins(): Promise<unknown[]> {
	const specifier = ['@c15t/svelte', 'vite'].join('/');
	try {
		const module = (await import(specifier)) as {
			consentManifest: (options: { onBuildError: 'runtime' }) => unknown;
		};
		return [module.consentManifest({ onBuildError: 'runtime' })].flat();
	} catch (error) {
		const code = (error as { code?: unknown } | null)?.code;
		if (code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
			return [];
		}
		throw error;
	}
};

/**
 * Plain object rather than `defineConfig`: the workspace root hoists a
 * newer Vite than this app builds with, and the two `Plugin` types are
 * structurally incompatible, so annotating the config makes `svelte-check`
 * fail on a config Vite itself accepts.
 *
 * SvelteKit options live here, not in `svelte.config.js`: SvelteKit 3 refuses
 * that file, and SvelteKit 2.63+ (the base revisions) reads the same options
 * from the plugin. SvelteKit 3 also dropped the built-in `$lib` alias, so it
 * is declared here; on SvelteKit 2 it matches the built-in one.
 * `tsconfig.json` inlines SvelteKit's options instead of extending them,
 * because each major generates its base config at a different path and Vite
 * fails on a missing `extends`; SvelteKit 3 warns about it and builds anyway.
 */
export default {
	plugins: [
		sveltekit({
			adapter: adapter(),
			alias: { $lib: 'src/lib' },
			preprocess: vitePreprocess(),
		}),
		...(await loadC15tPlugins()),
	],
};
