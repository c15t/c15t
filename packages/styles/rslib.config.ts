/**
 * @packageDocumentation
 * Build configuration for @c15t/styles package
 */

import { defineConfig } from '@rslib/core';

export default defineConfig({
	lib: [
		// ESM build only
		{
			format: 'esm',
			output: {
				distPath: {
					root: './dist',
				},
			},
			dts: {
				bundle: false,
			},
		},
	],
	source: {
		entry: {
			index: './src/index.ts',
		},
	},
	output: {
		target: 'web',
	},
});
