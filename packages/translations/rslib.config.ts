import { readdirSync } from 'node:fs';

import { defineConfig } from '@rslib/core';

import {
	getRsdoctorPlugins,
	standardExcludePatterns,
} from '../shared/rslib-utils';

// One entry per language, `@c15t/translations/<code>`, so an app loads only
// the languages it uses. English keeps its own `./en` entry.
const languageEntries = Object.fromEntries(
	readdirSync(new URL('./src/languages', import.meta.url))
		.filter((file) => file.endsWith('.ts'))
		.map((file) => {
			const name = `languages/${file.slice(0, -'.ts'.length)}`;
			return [name, [`./src/${name}.ts`]];
		})
);

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
		target: 'node',
	},
	source: {
		entry: {
			all: ['./src/all.ts'],
			index: ['./src/index.ts'],
			'translations/en': ['./src/translations/en.ts'],
			...languageEntries,
		},
		exclude: standardExcludePatterns,
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
