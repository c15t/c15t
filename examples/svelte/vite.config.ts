// #region docs:vite-config
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { consentManifest } from 'c15t/svelte/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [consentManifest(), svelte()],
});
// #endregion docs:vite-config
