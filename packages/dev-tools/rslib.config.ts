import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

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
			exportLocalsConvention: 'camelCase',
		},
		minify: {
			css: true,
		},
	},

	plugins: [
		pluginReact(),
		pluginSvgr({
			mixedImport: true,
			svgrOptions: {
				exportType: 'named',
			},
		}),
	],
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
