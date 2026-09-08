import { defineConfig } from '@rslib/core';

import {
	getRsdoctorPlugins,
	standardExcludePatterns,
} from '../shared/rslib-utils';

/**
 * Three outputs from one source tree:
 *
 * - `dist/index.js` + `dist/headless.js` — ESM for bundler users, with the
 *   workspace packages left external so they dedupe against `@c15t/core`.
 * - `dist/c15t.js` — a self-contained script-tag build: runtime, the
 *   vanilla banner and preference centre, the stylesheet, and auto-init
 *   from the `<script>` tag's `data-*` attributes.
 * - `dist/c15t.headless.js` — the same without any UI or CSS, for sites
 *   that render their own banner against `window.c15t`.
 */
const scriptTagLib = function scriptTagLib(name: string, entry: string) {
	return {
		autoExternal: false,
		dts: false,
		format: 'iife' as const,
		output: {
			distPath: { root: './dist' },
			filename: { js: '[name].js' },
			minify: true,
		},
		source: {
			entry: { [name]: entry },
		},
		// A fixed target keeps the CDN file readable by every browser that
		// still receives security updates, independent of the host's
		// browserslist.
		syntax: 'es2020' as const,
	};
};

export default defineConfig({
	lib: [
		{
			bundle: true,
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
			source: {
				entry: {
					headless: './src/headless.ts',
					index: './src/index.ts',
				},
			},
		},
		scriptTagLib('c15t', './src/entries/cdn.ts'),
		scriptTagLib('c15t.headless', './src/entries/cdn-headless.ts'),
	],
	output: {
		cleanDistPath: true,
		target: 'web',
	},
	source: {
		exclude: standardExcludePatterns,
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
