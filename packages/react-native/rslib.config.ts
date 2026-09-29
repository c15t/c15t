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
			source: {
				entry: {
					'**': standardSourceEntries,
				},
				exclude: standardExcludePatterns,
			},
		},
		{
			// Expo resolves a config plugin through Node's CommonJS resolver and
			// then `require()`s the file it finds. The unbundled ESM tree above only
			// survives that on a Node new enough to `require()` an ES module, and
			// even there the sibling `import`s are the fatal part, so this entry is
			// bundled into one self-contained CommonJS file. `autoExtension` gives it
			// `.cjs` because the package declares `type: module`, which is the path
			// the `require` export condition points at.
			bundle: true,
			dts: false,
			format: 'cjs',
			id: 'expo-plugin-cjs',
			output: {
				target: 'node',
			},
			source: {
				entry: {
					'expo-plugin/index': './src/expo-plugin/index.ts',
				},
			},
		},
	],
	output: {
		cleanDistPath: true,
		target: 'web',
	},
	plugins: [pluginReact()],
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
