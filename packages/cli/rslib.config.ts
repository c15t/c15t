import { defineConfig } from '@rslib/core';

import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
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
		cleanDistPath: true,
		filename: {
			js: '[name].mjs',
		},
		target: 'node',
	},
	source: {
		entry: {
			index: './src/index.ts',
		},
		exclude: ['figlet'],
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
