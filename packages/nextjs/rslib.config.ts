import { pluginReact } from '@rsbuild/plugin-react';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import { defineConfig } from '@rslib/core';

const externals = ['next', 'next/headers', 'react', 'react-dom'];

export default defineConfig({
	source: {
		entry: {
			index: ['./src/**'],
		},
		exclude: [
			'**/.DS_Store',
			'**/__tests__/**',
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
			'**/*.browser.test.ts',
			'**/*.e2e.test.tsx',
		],
	},
	lib: [
		{
			bundle: false,
			dts: true,
			format: 'esm',
			output: {
				externals,
			},
		},
		{
			bundle: false,
			dts: true,
			format: 'cjs',
			output: {
				externals,
			},
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
		externals,
		cssModules: {
			auto: true,
			localIdentName: 'c15t-[local]-[hash:base64:5]',
		},
		minify: {
			css: true,
		},
	},
	plugins: [pluginReact()],
	tools: {
		rspack: {
			plugins: [
				...(process.env.RSDOCTOR === 'true'
					? [
							new RsdoctorRspackPlugin({
								port: 3002,
								output: {
									mode: 'brief',
									options: {
										type: ['json'],
									},
								},
							}),
						]
					: []),
			],
		},
	},
});
