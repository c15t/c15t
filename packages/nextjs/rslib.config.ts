import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';
import {
	getRsdoctorPlugins,
	standardExcludePatterns,
} from '../shared/rslib-utils';

const externals = ['next', 'next/headers', 'react', 'react-dom'];

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
			output: {
				externals,
			},
		},
		{
			bundle: false,
			dts: true,
			format: 'cjs',
			output: {
				externals,
			},
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
		externals,
		cssModules: {
			auto: true,
			localIdentName: 'c15t-[local]-[hash:base64:5]',
		},
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
