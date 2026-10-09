// #region docs:vite-config
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { consentManifest } from 'c15t/tanstack-start/build';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_');

	return {
		plugins: [
			// Writes src/c15t-manifest.ts before Start compiles the app, and
			// passes the backend URL on to the app as VITE_C15T_BACKEND_URL.
			consentManifest({
				backendURL:
					env.VITE_C15T_BACKEND_URL ?? 'https://benchmarks-inth.inth.app',
			}),
			tanstackStart(),
			viteReact(),
		],
	};
});
// #endregion docs:vite-config
