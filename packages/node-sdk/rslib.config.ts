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
		target: 'node',
	},
	source: {
		entry: {
			index: ['./src/index.ts'],
			testing: ['./src/testing.ts'],
		},
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
