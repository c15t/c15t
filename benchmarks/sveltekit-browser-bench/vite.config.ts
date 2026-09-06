import { sveltekit } from '@sveltejs/kit/vite';

/**
 * Plain object rather than `defineConfig`: the workspace root hoists a
 * newer Vite than this app builds with, and the two `Plugin` types are
 * structurally incompatible, so annotating the config makes `svelte-check`
 * fail on a config Vite itself accepts.
 */
export default {
	plugins: [sveltekit()],
};
