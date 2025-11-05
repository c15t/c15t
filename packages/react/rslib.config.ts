import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';
import {
	getRsdoctorPlugins,
	standardExcludePatterns,
} from '../shared/rslib-utils';

export default defineConfig({
	source: {
		entry: {
			index: ['./src/**'],
		},
		exclude: standardExcludePatterns,
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
			exportLocalsConvention: 'camelCase',
		},
		injectStyles: true,
		minify: {
			css: true,
		},
	},
	plugins: [pluginReact()],
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
