import { defineConfig } from '@rslib/core';
export default defineConfig({
	source: {
		entry: {
			index: ['./src/**'],
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
});
