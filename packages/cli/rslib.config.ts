import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	source: {
		entry: {
			index: './src/index.ts',
		},
		exclude: ['figlet'],
	},
	lib: [
		{
			bundle: true,
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
		},
	],
	output: {
		target: 'node',
		cleanDistPath: true,
		filename: {
			js: '[name].mjs',
		},
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
