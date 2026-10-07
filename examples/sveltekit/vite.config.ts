// #region docs:vite-config
import { c15tPreload } from '@c15t/svelte/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({ adapter: adapter() }),
		// Lets c15tHandle preload the script loader on pages with scripts.
		c15tPreload(),
	],
});
// #endregion docs:vite-config
