import { c15tStylesPlugin } from '@c15t/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [c15tStylesPlugin(), tailwindcss(), sveltekit()],
	ssr: {
		noExternal: ['@c15t/ui', '@c15t/svelte'],
	},
});
