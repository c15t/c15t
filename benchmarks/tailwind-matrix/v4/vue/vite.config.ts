// #region docs:vite-config title="vite.config.ts"
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import c15tVue from 'c15t/vue/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [vue(), c15tVue(), tailwindcss()] });
// #endregion docs:vite-config
