// #region docs:vite-config title="vite.config.ts"
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [sveltekit({ adapter: adapter() })] });
// #endregion docs:vite-config
