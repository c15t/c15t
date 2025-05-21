import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

export default defineConfig({
	source: {
		entry: {
			index: ['./src/**'],
		},
	},
	lib: [
		{
			bundle: false,
			dts: true,
			format: 'esm',
		},
		{
			bundle: false,
			dts: true,
			format: 'cjs',
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
		cssModules: {
			auto: true,
			localIdentName: 'c15t-[local]-[hash:base64:5]',
		},
		minify: {
			css: true,
		},
	},
	plugins: [pluginReact()],
});
