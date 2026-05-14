import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

const externals = ['@c15t/iab-v3'];

export default defineConfig({
	source: {
		entry: {
			index: ['./src/index.ts'],
			headless: ['./src/headless.ts'],
			v3: ['./src/v3/index.ts'],
		},
		exclude: [
			'**/__tests__/**',
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
		],
	},
	lib: [
		{
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
		},
		{
			dts: false,
			format: 'cjs',
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
		externals,
	},
	performance: {
		buildCache: false,
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
