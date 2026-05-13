import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	source: {
		entry: {
			index: ['./src/index.ts'],
			testing: ['./src/testing.ts'],
		},
	},
	lib: [
		{
			dts: {
				distPath: './dist-types',
			},
			bundle: true,
			format: 'esm',
		},
		{
			dts: false,
			bundle: true,
			format: 'cjs',
		},
	],
	output: {
		target: 'node',
		cleanDistPath: true,
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
