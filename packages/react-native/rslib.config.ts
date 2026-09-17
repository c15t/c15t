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
		target: 'web',
	},
	source: {
		entry: {
			'**': standardSourceEntries,
		},
		exclude: standardExcludePatterns,
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
