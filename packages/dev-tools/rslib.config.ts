import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

import { getRsdoctorPlugins } from '../shared/rslib-utils';

export default defineConfig({
	lib: [
		{
			bundle: true,
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
		},
	],
	output: {
		cleanDistPath: true,
		injectStyles: true,
		target: 'web',
	},
	plugins: [pluginReact()],
	source: {
		entry: {
			index: './src/index.ts',
			react: './src/react.ts',
			tanstack: './src/tanstack.ts',
		},
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
