import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

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
		injectStyles: true,
		minify: {
			css: true,
		},
	},
	tools: {
		rspack: {
			module: {
				rules: [
					{
						test: /\.svg$/,
						type: 'asset/resource',
						generator: {
							filename: 'public/[name][ext]',
						},
						exclude: /node_modules/,
					},
				],
			},
		},
	},
	plugins: [pluginReact()],
});
