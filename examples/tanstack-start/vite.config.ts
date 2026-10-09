// #region docs:vite-config
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { consentManifest } from 'c15t/tanstack-start/build';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		// Reads VITE_C15T_BACKEND_URL, writes src/c15t-manifest.ts before Start
		// compiles the app, and passes the URL on to the app.
		consentManifest(),
		tanstackStart(),
		viteReact(),
	],
});
// #endregion docs:vite-config
