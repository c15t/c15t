import { pluginReact } from '@rsbuild/plugin-react';
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
		target: 'web',
	},
	performance: {
		// Temporary workaround for rspack persistent-cache panics in local builds.
		buildCache: false,
	},
	plugins: [
		pluginReact(),
		publicEntryAliases({
			'consent-record.js': './consent-record/index.js',
			'generate-subject-id.js': './libs/generate-subject-id.js',
			'iframe-blocker.js': './modules/iframe-blocker/index.js',
			'network-blocker.js': './modules/network-blocker/index.js',
			'persistence.js': './modules/persistence/index.js',
			'script-loader.js': './modules/script-loader/index.js',
			'transport-manifest.js': './transports/manifest.js',
			'transports.js': './transports/index.js',
			'window-debug.js': './modules/window-debug/index.js',
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
			'**/*.browser.test.ts',
		],
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
