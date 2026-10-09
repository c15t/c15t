// #region docs:vite-config
import vue from '@vitejs/plugin-vue';
import { consentManifest } from 'c15t/vue/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [vue(), consentManifest()],
});
// #endregion docs:vite-config
