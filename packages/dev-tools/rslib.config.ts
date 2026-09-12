import { defineConfig } from '@rslib/core';

import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	lib: [
		{
			bundle: true,
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
		},
	],
	output: {
		cleanDistPath: true,
		// The stylesheet ships as a string inside the panel's shadow root.
		injectStyles: false,
		target: 'web',
	},
	source: {
		entry: {
			index: './src/index.ts',
		},
		exclude: ['**/__tests__/**', '**/*.test.ts'],
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
