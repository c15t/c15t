import { sveltekit } from '@sveltejs/kit/vite';

/**
 * `c15tPreload()` lets `c15tHandle` preload the on-demand script loader and
 * network blocker chunks on the routes that configure them.
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
			c15tPreload: () => unknown;
		};
		return [module.c15tPreload()];
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
 */
export default {
	plugins: [sveltekit(), ...(await loadC15tPlugins())],
};
