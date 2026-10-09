// #region docs:vite-config
import { consentManifest } from '@c15t/svelte/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// #hide docs
// The demo project, so the example runs without setting the variable.
process.env.VITE_C15T_BACKEND_URL ??= 'https://benchmarks-inth.inth.app';
// #endhide docs

export default defineConfig({
	plugins: [
		// Downloads the policy from VITE_C15T_BACKEND_URL when Vite starts and
		// writes it to `src/c15t-manifest.ts`.
		consentManifest(),
		svelte(),
	],
});
// #endregion docs:vite-config
