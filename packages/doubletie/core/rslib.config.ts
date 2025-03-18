import { defineConfig } from '@rslib/core';

export default defineConfig({
	source: {
		entry: {
			// Main entry point
			index: ['./src/index.ts'],

			// Module entry points
			'schema/index': ['./src/schema/index.ts'],
			'entity/index': ['./src/entity/index.ts'],
			'db/index': ['./src/db/index.ts'],
			'validation/index': ['./src/validation/index.ts'],
			'config/index': ['./src/config/index.ts'],
		},
	},
	lib: [
		{
			dts: true,
			bundle: true,
			format: 'esm',
		},
		{
			dts: true,
			bundle: true,
			format: 'cjs',
		},
	],
	output: {
		target: 'node',
		cleanDistPath: true,
	},
});
