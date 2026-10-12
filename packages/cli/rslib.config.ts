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
		filename: {
			js: '[name].mjs',
		},
		target: 'node',
	},
	source: {
		entry: {
			agent: './src/frontend/agent/index.ts',
			bin: './src/bin.ts',
			commands: './src/commands/registry.ts',
			frontend: './src/frontend/index.ts',
			generate: './src/generate/index.ts',
			index: './src/index.ts',
			runtime: './src/frontend/runtime/index.ts',
		},
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
