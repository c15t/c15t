// #region docs:vite-config
import react from '@vitejs/plugin-react';
import { consentManifest } from 'c15t/build';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		react(),
		// Downloads the policy from VITE_C15T_BACKEND_URL and writes
		// src/c15t-manifest.ts.
		consentManifest(),
	],
});
// #endregion docs:vite-config
