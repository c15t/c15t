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
			index: ['./src/index.ts'],
			v3: ['./src/v3/index.ts'],
			'v3-consent-record': ['./src/v3/consent-record/index.ts'],
			'v3-generate-subject-id': ['./src/v3/libs/generate-subject-id.ts'],
			'v3-iframe-blocker': ['./src/v3/modules/iframe-blocker/index.ts'],
			'v3-network-blocker': ['./src/v3/modules/network-blocker/index.ts'],
			'v3-persistence': ['./src/v3/modules/persistence/index.ts'],
			'v3-script-loader': ['./src/v3/modules/script-loader/index.ts'],
			'v3-transports': ['./src/v3/transports/index.ts'],
			'v3-window-debug': ['./src/v3/modules/window-debug/index.ts'],
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
