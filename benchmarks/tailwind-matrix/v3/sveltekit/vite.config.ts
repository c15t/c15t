// #region docs:vite-config title="vite.config.ts"
// #hide docs
import adapter from '@sveltejs/adapter-static';
// #endhide docs
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			// Keep your existing SvelteKit options here.
			// #hide docs
			adapter: adapter(),
			// #endhide docs
		}),
	],
});
// #endregion docs:vite-config
