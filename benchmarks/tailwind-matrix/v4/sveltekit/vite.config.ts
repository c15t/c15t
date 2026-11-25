// #region docs:vite-config title="vite.config.ts"
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit({ adapter: adapter() })],
});
// #endregion docs:vite-config
