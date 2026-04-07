import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

const config = {
	plugins: {
		'postcss-import': {
			path: [
				path.join(configDir, 'node_modules'),
				path.join(configDir, '..', '..', 'node_modules'),
			],
		},
		tailwindcss: {},
		autoprefixer: {},
	},
};

export default config;
