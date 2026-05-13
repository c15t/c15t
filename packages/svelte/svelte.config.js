import { resolve } from 'node:path';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),
	kit: {
		files: {
			lib: 'src/lib',
		},
		alias: {
			'~': resolve('./src/lib'),
		},
	},
};
