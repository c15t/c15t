import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

export default defineConfig({
	source: {
		entry: {
			index: ['./src/index.ts'],
			'/scripts/google-tag-manager': ['./src/scripts/google-tag-manager.ts'],
			'/scripts/posthog': ['./src/scripts/posthog.ts'],
			'/scripts/meta-pixel': ['./src/scripts/meta-pixel.ts'],
			'/scripts/tiktok-pixel': ['./src/scripts/tiktok-pixel.ts'],
			'/scripts/linkedin-insights': ['./src/scripts/linkedin-insights.ts'],
			'/scripts/microsoft-uet': ['./src/scripts/microsoft-uet.ts'],
			'/scripts/google-tag': ['./src/scripts/google-tag.ts'],
			'/scripts/x-pixel': ['./src/scripts/x-pixel.ts'],
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
});
