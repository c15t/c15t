import { defineConfig } from '@rslib/core';

import {
	compactModuleMinify,
	publicEntryAliases,
} from '../shared/rslib-modules';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	lib: [
		{
			bundle: false,
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
			outBase: './src',
		},
	],
	output: {
		cleanDistPath: true,
		minify: compactModuleMinify,
		target: 'node',
	},
	performance: {
		// Avoid stale externalized imports when switching bundled/module builds.
		buildCache: false,
	},
	plugins: [
		publicEntryAliases({
			'config.js': './config/index.js',
			'geo.js': './shared/geo-headers.js',
		}),
	],
	source: {
		entry: {
			index: [
				'./src/**/*.ts',
				'!./src/**/__tests__/**',
				'!./src/**/*.test.ts',
				'!./src/**/*.spec.ts',
			],
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
