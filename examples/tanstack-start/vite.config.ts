// #region docs:vite-config
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { consentManifest } from 'c15t/tanstack-start/build';
import { defineConfig } from 'vite';

// #hide docs
// The demo project, so the example runs without setting the variable.
process.env.VITE_C15T_BACKEND_URL ??= 'https://benchmarks-inth.inth.app';
// #endhide docs

export default defineConfig({
	plugins: [
		// Reads VITE_C15T_BACKEND_URL and writes src/c15t-manifest.ts before
		// Start compiles the app.
		consentManifest(),
		tanstackStart(),
		viteReact(),
	],
});
// #endregion docs:vite-config
