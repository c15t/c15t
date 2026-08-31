import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

import {
	getRsdoctorPlugins,
	standardExcludePatterns,
	standardSourceEntries,
} from '../shared/rslib-utils';

export default defineConfig({
	lib: [
		{
			bundle: false,
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
		},
	],
	output: {
		cleanDistPath: true,
		cssModules: {
			auto: true,
			exportLocalsConvention: 'camelCase',
			localIdentName: 'c15t-[local]-[hash:base64:5]',
		},
		injectStyles: false,
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
