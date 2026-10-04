import { sveltekit } from '@sveltejs/kit/vite';

/**
 * `c15tPreload()` lets `c15tHandle` preload the on-demand script loader and
 * network blocker chunks on the routes that configure them. A base revision
 * from before the plugin existed builds without it, which is how it ran.
 */
const c15tPlugins = await import('@c15t/svelte/vite').then(
	(module) => [module.c15tPreload()],
	() => []
);

/**
 * Plain object rather than `defineConfig`: the workspace root hoists a
 * newer Vite than this app builds with, and the two `Plugin` types are
 * structurally incompatible, so annotating the config makes `svelte-check`
 * fail on a config Vite itself accepts.
 */
export default {
	plugins: [sveltekit(), ...c15tPlugins],
};
