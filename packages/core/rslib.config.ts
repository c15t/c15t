import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	source: {
		entry: {
			index: ['./src/index.ts'],
			v3: ['./src/v3/index.ts'],
			'v3-script-loader': ['./src/v3/modules/script-loader/index.ts'],
			'v3-network-blocker': ['./src/v3/modules/network-blocker/index.ts'],
			'v3-iframe-blocker': ['./src/v3/modules/iframe-blocker/index.ts'],
			'v3-persistence': ['./src/v3/modules/persistence/index.ts'],
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
	},
	performance: {
		// Temporary workaround for rspack persistent-cache panics in local builds.
		buildCache: false,
	},
	plugins: [pluginReact()],
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
