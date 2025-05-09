import { defineConfig } from '@rslib/core';

export default defineConfig({
	source: {
		entry: {
			index: ['./src/index.ts'],
			'node-sdk': ['./src/node-sdk.ts'],
			backend: ['./src/backend.ts'],
		},
	},
	lib: [
		{
			dts: true,
			bundle: true,
			format: 'esm',
		},
		// {
		// 	dts: true,
		// 	bundle: true,
		// 	format: 'cjs',
		// },
	],
	output: {
		target: 'node',
		cleanDistPath: true,
	},
});
