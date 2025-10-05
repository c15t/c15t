/**
 * @packageDocumentation
 * Build configuration for @c15t/destinations package
 */

import { defineConfig } from '@rslib/core';

export default defineConfig({
	lib: [
		// ESM build with TypeScript declarations
		{
			format: 'esm',
			bundle: false,
			dts: true, // Generate TypeScript declarations
			output: {
				cleanDistPath: true,
				distPath: {
					root: './dist',
				},
			},
		},
	],
	source: {
		entry: {
			index: './src/**',
		},
	},
	output: {
		target: 'node',
	},
});
