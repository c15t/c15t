import { pluginReact } from '@rsbuild/plugin-react';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import { defineConfig } from '@rslib/core';

export default defineConfig({
	source: {
		entry: {
			index: ['./src/index.ts'],
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
			dts: true,
			format: 'esm',
		},
		{
			dts: true,
			format: 'cjs',
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
	},
	plugins: [pluginReact()],
	tools: {
		rspack: {
			plugins: [
				new RsdoctorRspackPlugin({
					output: {
						mode: 'brief',
						options: {
							type: ['json'],
						},
					},
				}),
			],
		},
	},
});
