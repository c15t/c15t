import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';
import {
	getRsdoctorPlugins,
	standardExcludePatterns,
	standardSourceEntries,
} from '../shared/rslib-utils';

const externals = [
	'react',
	'react-dom',
	'c15t',
	'c15t-v3',
	'@c15t/iab-v3',
	'@c15t/ui',
];

export default defineConfig({
	source: {
		entry: { index: standardSourceEntries },
		exclude: standardExcludePatterns,
	},
	lib: [
		{
			bundle: false,
			dts: { distPath: './dist-types' },
			format: 'esm',
			output: { externals },
		},
		{
			bundle: false,
			dts: false,
			format: 'cjs',
			output: { externals },
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
		externals,
		cssModules: {
			auto: true,
			localIdentName: 'c15t-[local]-[hash:base64:5]',
			exportLocalsConvention: 'camelCase',
		},
		injectStyles: false,
		minify: { css: true },
	},
	plugins: [pluginReact()],
	tools: { rspack: { plugins: [...getRsdoctorPlugins()] } },
});
