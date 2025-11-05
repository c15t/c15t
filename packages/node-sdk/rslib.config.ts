import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	source: {
		entry: {
			index: ['./src/index.ts'],
		},
	},
	lib: [
		{
			dts: true,
			bundle: true,
			format: 'esm',
		},
		{
			dts: true,
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
