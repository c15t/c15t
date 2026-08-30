import { defineConfig } from '@rslib/core';

import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	source: {
		entry: {
			index: ['./src/index.ts'],
			types: ['./src/types.ts'],
			config: ['./src/config/index.ts'],
			geo: ['./src/shared/geo-headers.ts'],
		},
		exclude: [
			'**/__tests__/**',
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
		],
	},
	lib: [
		{
			dts: {
				distPath: './dist-types',
			},
			bundle: true,
			format: 'esm',
		},
	],
	output: {
		target: 'node',
		cleanDistPath: true,
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
