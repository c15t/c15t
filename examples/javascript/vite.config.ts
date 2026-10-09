// #region docs:vite-config
import { consentManifest } from 'c15t/build';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		// Downloads the policy from VITE_C15T_BACKEND_URL and writes
		// src/c15t-manifest.ts.
		consentManifest(),
	],
});
// #endregion docs:vite-config
