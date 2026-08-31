import { resolve } from 'node:path';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	kit: {
		alias: {
			'~': resolve('./src/lib'),
		},
		files: {
			lib: 'src/lib',
		},
	},
	preprocess: vitePreprocess(),
};
