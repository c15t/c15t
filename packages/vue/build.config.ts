import { fileURLToPath } from 'node:url';

import { resolve } from 'pathe';
import { defineBuildConfig } from 'unbuild';

const dir = fileURLToPath(new URL('.', import.meta.url));

export default defineBuildConfig({
	alias: {
		'#imports': resolve(dir, 'src/runtime/vue/stubs.ts'),
	},
	declaration: true,
	entries: ['./src/vite', './src/index', './src/devtools'],
	externals: [
		'vue',
		'vite',
		'@c15t/schema',
		'@c15t/ui',
		'@c15t/core',
		'@c15t/dev-tools',
		'reka-ui',
		'defu',
		'ufo',
	],
});
