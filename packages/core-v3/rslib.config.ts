import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

const externals = ['c15t'];

export default defineConfig({
	source: {
		entry: {
			index: ['./src/index.ts'],
			'script-loader': ['./src/modules/script-loader/index.ts'],
			'network-blocker': ['./src/modules/network-blocker/index.ts'],
			'iframe-blocker': ['./src/modules/iframe-blocker/index.ts'],
			persistence: ['./src/modules/persistence/index.ts'],
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
			dts: { distPath: './dist-types' },
			format: 'esm',
			output: { externals },
		},
		{
			dts: false,
			format: 'cjs',
			output: { externals },
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
		externals,
	},
	performance: { buildCache: false },
	plugins: [pluginReact()],
	tools: { rspack: { plugins: [...getRsdoctorPlugins()] } },
});
