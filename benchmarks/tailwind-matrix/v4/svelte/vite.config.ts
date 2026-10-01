// #region docs:vite-config title="vite.config.ts"
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [svelte(), tailwindcss()] });
// #endregion docs:vite-config
