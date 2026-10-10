// #region docs:vite-config
import { consentManifest } from '@c15t/svelte/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [consentManifest(), svelte()],
});
// #endregion docs:vite-config
