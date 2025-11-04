import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	source: {
		entry: {
			'**': ['./src/**'],
		},
	},
	lib: [
		{
			dts: true,
			bundle: false,
			format: 'esm',
		},
		{
			dts: true,
			bundle: false,
			format: 'cjs',
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
