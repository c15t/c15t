import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));

const config = {
	plugins: [
		resolve(configDir, './postcss-c15t-layer-compat.cjs'),
		'tailwindcss',
		'autoprefixer',
	],
};

export default config;
