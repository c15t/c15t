// #region docs:vite-config title="vite.config.ts"
// #hide docs
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
// #endhide docs
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		// Keep your existing sveltekit() plugin here.
		// #hide docs
		sveltekit({ adapter: adapter() }),
		// #endhide docs
	],
});
// #endregion docs:vite-config
