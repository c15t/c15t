// #region docs:vite-config
import react from '@vitejs/plugin-react';
import { consentManifest } from 'c15t/build';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_');
	return {
		plugins: [
			react(),
			// Downloads the policy and writes src/c15t-manifest.ts.
			consentManifest({
				backendURL:
					env.VITE_C15T_BACKEND_URL ?? 'https://benchmarks-inth.inth.app',
			}),
		],
	};
});
// #endregion docs:vite-config
