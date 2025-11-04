import { pluginReact } from '@rsbuild/plugin-react';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
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
	},
	plugins: [pluginReact()],
	tools: {
		rspack: {
			plugins: [
				...(process.env.RSDOCTOR
					? [
							new RsdoctorRspackPlugin({
								disableClientServer: true,
								output: {
									mode: 'brief',
									options: {
										type: ['json'],
									},
								},
							}),
						]
					: []),
			],
		},
	},
});
