// #region docs:vite-config
import { c15tPreload, consentManifest } from '@c15t/svelte/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		// Downloads the policy from PUBLIC_C15T_BACKEND_URL when Vite starts
		// and writes it to a module the server imports.
		consentManifest({ outputFile: 'src/lib/server/c15t-manifest.ts' }),
		sveltekit({ adapter: adapter() }),
		// Lets c15tHandle preload the script loader on pages with scripts.
		c15tPreload(),
	],
});
// #endregion docs:vite-config
