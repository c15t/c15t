// #region docs:vite-config title="vite.config.ts"
import adapter from '@sveltejs/adapter-static'; // docs:hide
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			// Keep your existing SvelteKit options here.
			adapter: adapter(), // docs:hide
		}),
	],
});
// #endregion docs:vite-config
