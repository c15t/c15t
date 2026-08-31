import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const root = dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			'~/*': resolve(root, '../../packages/core/src/*'),
		},
	},
	preprocess: vitePreprocess(),
};

export default config;
