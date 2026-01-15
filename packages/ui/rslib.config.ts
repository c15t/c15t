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
		copy: [{ from: './src/styles', to: './styles' }],
		cssModules: {
			auto: true,
			localIdentName: 'c15t-ui-[local]-[hash:base64:5]',
			exportLocalsConvention: 'camelCase',
		},
		injectStyles: true,
		minify: {
			css: true,
		},
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
