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
			localIdentName: 'c15t-ui-[local]-[hash:base64:5]',
		},
		injectStyles: false,
		minify: {
			css: true,
		},
		target: 'web',
	},
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
