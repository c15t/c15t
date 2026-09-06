import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	lib: [
		{
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
		},
	],
	output: {
		cleanDistPath: true,
		target: 'web',
	},
	performance: {
		// Temporary workaround for rspack persistent-cache panics in local builds.
		buildCache: false,
	},
	plugins: [pluginReact()],
	source: {
		entry: {
			'consent-record': ['./src/consent-record/index.ts'],
			'generate-subject-id': ['./src/libs/generate-subject-id.ts'],
			'iframe-blocker': ['./src/modules/iframe-blocker/index.ts'],
			index: ['./src/index.ts'],
			'manifest-cache': ['./src/libs/manifest-cache.ts'],
			'network-blocker': ['./src/modules/network-blocker/index.ts'],
			persistence: ['./src/modules/persistence/index.ts'],
			runtime: ['./src/runtime/index.ts'],
			'script-loader': ['./src/modules/script-loader/index.ts'],
			server: ['./src/server/index.ts'],
			'transport-manifest': ['./src/transports/manifest.ts'],
			'transport-manifest-cache': ['./src/transports/manifest-cache.ts'],
			transports: ['./src/transports/index.ts'],
			'window-debug': ['./src/modules/window-debug/index.ts'],
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
