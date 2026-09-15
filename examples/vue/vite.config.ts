import vue from '@vitejs/plugin-vue';
import c15tVue from 'c15t/vue/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [vue(), c15tVue()] });
