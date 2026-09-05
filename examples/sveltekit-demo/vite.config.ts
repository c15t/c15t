import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		watch: {
			// Consent saves must not reload the page and discard DevTools history.
			ignored: ['**/c15t.db', '**/c15t.db-shm', '**/c15t.db-wal'],
		},
	},
});
