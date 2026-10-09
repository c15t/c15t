import { consentManifest } from '@c15t/svelte/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			preprocess: vitePreprocess(),
		}),
		// Lets c15tHandle preload the script loader on pages with scripts. The
		// areas of this app use different backends, so a build without a
		// backend URL keeps going and each server load reads its policy at
		// runtime.
		consentManifest({ onBuildError: 'runtime' }),
	],
	server: {
		watch: {
			// Consent saves must not reload the page and discard DevTools history.
			ignored: ['**/c15t.db', '**/c15t.db-shm', '**/c15t.db-wal'],
		},
	},
	ssr: {
		// Transform workspace CSS imports instead of passing them to Node's loader.
		noExternal: ['@c15t/ui', '@c15t/dev-tools'],
	},
});
