import { defineConfig } from '@rslib/core';

import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	lib: [
		{
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
		},
	],
	output: {
		cleanDistPath: true,
		target: 'web',
	},
	performance: {
		buildCache: false,
	},
	source: {
		entry: {
			headless: ['./src/headless.ts'],
			index: ['./src/index.ts'],
			v3: ['./src/v3/index.ts'],
			'v3/headless': ['./src/v3/headless.ts'],
		},
		exclude: [
			'**/__tests__/**',
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
		],
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
