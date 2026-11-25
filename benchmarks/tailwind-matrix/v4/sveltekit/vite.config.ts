// #region docs:vite-config title="vite.config.ts"
import adapter from '@sveltejs/adapter-static'; // docs:hide
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			// Keep your existing SvelteKit options here.
			adapter: adapter(), // docs:hide
		}),
	],
});
// #endregion docs:vite-config
