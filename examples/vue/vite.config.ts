// #region docs:vite-config
import vue from '@vitejs/plugin-vue';
import { consentManifest } from 'c15t/build';
import c15tVue from 'c15t/vue/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		vue(),
		c15tVue(),
		// Downloads the policy from VITE_C15T_BACKEND_URL and serves it as
		// `c15t/generated`.
		consentManifest(),
	],
});
// #endregion docs:vite-config
