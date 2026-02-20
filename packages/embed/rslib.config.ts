import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	source: {
		entry: {
			devtools: './src/devtools.ts',
			index: './src/index.ts',
			runtime: './src/runtime.tsx',
			'runtime-full': './src/runtime-full.ts',
			'runtime-iab': './src/runtime-iab.tsx',
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
			bundle: true,
			dts: true,
			format: 'esm',
		},
		{
			bundle: true,
			dts: true,
			format: 'cjs',
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
		injectStyles: true,
	},
	plugins: [pluginReact()],
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
