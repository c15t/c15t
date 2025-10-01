/**
 * @packageDocumentation
 * Build configuration for @c15t/styles package
 */

import { pluginTypedCSSModules } from '@rsbuild/plugin-typed-css-modules';
import { defineConfig } from '@rslib/core';

export default defineConfig({
	lib: [
		// ESM build only
		{
			format: 'esm',
      bundle: false,
			output: {
				cleanDistPath: true,
				distPath: {
					root: './dist',
				},
			},
			dts: {
				bundle: false,
			},
		},
	],
	source: {
		entry: {
			index: './src/**'
		},
	},
	output: {
		target: 'web',
    cssModules: {
      auto: false,
    }
	},
	plugins: [pluginTypedCSSModules()],
});
