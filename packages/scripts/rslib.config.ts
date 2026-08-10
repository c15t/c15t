import { defineConfig } from '@rslib/core';
import {
	getRsdoctorPlugins,
	standardExcludePatterns,
	standardSourceEntries,
} from '../shared/rslib-utils';

export default defineConfig({
	source: {
		entry: {
			'**': standardSourceEntries,
		},
		exclude: standardExcludePatterns,
	},
	lib: [
		{
			dts: {
				distPath: './dist-types',
			},
			bundle: false,
			format: 'esm',
		},
	],
	output: {
		target: 'web',
		cleanDistPath: true,
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
