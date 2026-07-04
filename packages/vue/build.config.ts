import { fileURLToPath } from 'node:url';
import { resolve } from 'pathe';
import { defineBuildConfig } from 'unbuild';

const dir = fileURLToPath(new URL('.', import.meta.url));

export default defineBuildConfig({
	entries: ['./src/vite', './src/index'],
	declaration: true,
	alias: {
		'#imports': resolve(dir, 'src/runtime/vue/stubs.ts'),
	},
	externals: [
		'vue',
		'vite',
		'@c15t/schema',
		'@c15t/styles',
		'c15t',
		'@vueuse/core',
		'reka-ui',
		'defu',
		'ufo',
	],
});
