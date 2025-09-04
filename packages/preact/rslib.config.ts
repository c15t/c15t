import { pluginPreact } from '@rsbuild/plugin-preact';
import { defineConfig } from '@rslib/core';

export default defineConfig({
	source: {
		entry: {
			headless: ['./src/headless.ts'],
			'consent-manager-dialog': [
				'./src/components/consent-manager-dialog/index.ts',
			],
			'consent-manager-widget': [
				'./src/components/consent-manager-widget/index.ts',
			],
			'cookie-banner': ['./src/components/cookie-banner/index.tsx'],
			hooks: ['./src/hooks/index.ts'],
			index: ['./src/index.ts'],
		},
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
		cssModules: {
			auto: true,
			localIdentName: 'c15t-[local]-[hash:base64:5]',
			exportLocalsConvention: 'camelCase',
		},
		injectStyles: true,
		minify: {
			js: false,
			css: false,
		},
	},
	plugins: [pluginPreact()],
});
