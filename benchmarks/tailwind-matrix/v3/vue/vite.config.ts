// #region docs:vite-config title="vite.config.ts"
import vue from '@vitejs/plugin-vue';
import { consentManifest } from 'c15t/vue/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [vue(), consentManifest({ backendURL: '/api/c15t' })],
});
// #endregion docs:vite-config
