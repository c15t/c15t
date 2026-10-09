// #region docs:vite-config
import { consentManifest } from 'c15t/build';
import { defineConfig } from 'vite';

// #hide docs
// The demo project, so the example runs without setting the variable.
process.env.VITE_C15T_BACKEND_URL ??= 'https://benchmarks-inth.inth.app';
// #endhide docs

export default defineConfig({
	plugins: [
		// Downloads the policy from VITE_C15T_BACKEND_URL and writes
		// src/c15t-manifest.ts.
		consentManifest(),
	],
});
// #endregion docs:vite-config
