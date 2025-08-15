import { defineConfig } from '@rslib/core';

export default defineConfig({
	source: {
		entry: {
			index: './src/main.ts',
		},
		exclude: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
	},
	lib: [
		{
			bundle: true,
			// GitHub Actions run with Node and expect CommonJS entry
			format: 'cjs',
			dts: false,
		},
	],
	output: {
		target: 'node',
		cleanDistPath: true,
		filename: {
			js: 'index.js',
		},
	},
});
