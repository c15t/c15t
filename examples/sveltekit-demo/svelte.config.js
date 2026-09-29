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
		prerender: {
			// `/consent-example/static` reads PUBLIC_C15T_BACKEND_URL when it is
			// prerendered. Builds without it, such as type checks and unrelated
			// CI jobs, skip that page instead of failing.
			handleHttpError: process.env.PUBLIC_C15T_BACKEND_URL ? 'fail' : 'warn',
		},
	},
	preprocess: vitePreprocess(),
};

export default config;
