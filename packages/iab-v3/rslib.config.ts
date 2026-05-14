import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

const externals = ['c15t', 'c15t-v3'];

export default defineConfig({
	source: {
		entry: { index: ['./src/index.ts'] },
		exclude: [
			'**/__tests__/**',
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
		],
	},
	lib: [
		{ dts: { distPath: './dist-types' }, format: 'esm', output: { externals } },
		{ dts: false, format: 'cjs', output: { externals } },
	],
	output: { target: 'web', cleanDistPath: true, externals },
	performance: { buildCache: false },
	tools: { rspack: { plugins: [...getRsdoctorPlugins()] } },
});
