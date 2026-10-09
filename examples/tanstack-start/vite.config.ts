// #region docs:vite-config
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { consentManifest } from 'c15t/tanstack-start/build';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		// Downloads the policy from VITE_C15T_BACKEND_URL, serves it to server
		// code as `c15t/generated`, and passes the URL on to the app.
		consentManifest(),
		tanstackStart(),
		viteReact(),
	],
});
// #endregion docs:vite-config
