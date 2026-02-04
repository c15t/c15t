import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	source: {
		entry: {
			index: './src/index.ts',
			react: './src/react.ts',
			tanstack: './src/tanstack.ts',
		},
	},
	lib: [
		{
			bundle: true,
			dts: true,
			format: 'esm',
		},
		{
			bundle: true,
			dts: true,
			format: 'cjs',
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
		injectStyles: true,
	},
	plugins: [pluginReact()],
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
