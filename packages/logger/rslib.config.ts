import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import { defineConfig } from '@rslib/core';

export default defineConfig({
	source: {
		entry: {
			'**': ['./src/**'],
		},
	},
	lib: [
		{
			dts: true,
			bundle: false,
			format: 'esm',
		},
		{
			dts: true,
			bundle: false,
			format: 'cjs',
		},
	],
	output: {
		target: 'node',
		cleanDistPath: true,
	},
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
