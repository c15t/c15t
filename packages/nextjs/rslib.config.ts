import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

import {
	getRsdoctorPlugins,
	standardExcludePatterns,
	standardSourceEntries,
} from '../shared/rslib-utils';

const externals = [
	'next',
	'next/headers',
	'next/headers.js',
	'next/server',
	'next/server.js',
	'react',
	'react-dom',
];

export default defineConfig({
	lib: [
		{
			bundle: false,
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
			output: {
				externals,
			},
		},
	],
	output: {
		cleanDistPath: true,
		cssModules: {
			auto: true,
			localIdentName: 'c15t-[local]-[hash:base64:5]',
		},
		externals,
		minify: {
			css: true,
		},
		target: 'web',
	},
	plugins: [pluginReact()],
	source: {
		entry: {
			index: standardSourceEntries,
		},
		exclude: standardExcludePatterns,
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
