// #region docs:vite-config title="vite.config.ts"
// #hide docs
import adapter from '@sveltejs/adapter-static';
// #endhide docs
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			// Keep your existing SvelteKit options here.
			// #hide docs
			adapter: adapter(),
			// #endhide docs
		}),
	],
});
// #endregion docs:vite-config
