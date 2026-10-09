// #region docs:vite-config
import { consentManifest } from '@c15t/svelte/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [consentManifest(), sveltekit({ adapter: adapter() })],
});
// #endregion docs:vite-config
