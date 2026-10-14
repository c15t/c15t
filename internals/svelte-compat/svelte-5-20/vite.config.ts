import { consentManifest } from '@c15t/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [consentManifest(), sveltekit()],
});
