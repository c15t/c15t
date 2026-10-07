import { defineConfig, rspack } from '@rslib/core';

import {
	getRsdoctorPlugins,
	standardExcludePatterns,
} from '../shared/rslib-utils';
import { iabBundleBoundary } from './scripts/iab-bundle-boundary';
import { modeBundleBoundary } from './scripts/mode-bundle-boundary';

/**
 * ESM entries and standalone script builds from one source tree:
 *
 * - `dist/index.js` + `dist/headless.js` — ESM for bundler users, with the
 *   workspace packages left external so they dedupe against `@c15t/core`.
 * - `dist/postcss-tailwind3.js` — a re-export of `@c15t/ui/postcss-tailwind3`
 *   for Tailwind 3 PostCSS configs.
 * - `dist/c15t.js` — a self-contained hosted script-tag build: runtime, the
 *   vanilla banner and preference centre, the stylesheet, and auto-init
 *   from the `<script>` tag's `data-*` attributes.
 * - `dist/c15t.offline.js` — the stock UI with local policy resolution.
 * - `dist/c15t.headless.js` — the same without any UI or CSS, for sites
 *   that render their own banner against `window.c15t`.
 * - `dist/c15t.iab.js` — an optional replacement with the CMP and IAB UI.
 * - `dist/c15t.devtools.js` — the DevTools panel as a second tag.
 * - `dist/c15t.gpp.js` — IAB GPP as a second tag.
 */
/** Script builds allowed to contain `@c15t/iab` code. */
const IAB_BUNDLES = new Set(['c15t.iab', 'c15t.gpp']);

/**
 * The ESM build loads the preference centre on demand
 * (`ui/dialog-surface.ts`). A script tag has nowhere to load a chunk from,
 * so the script-tag builds use the dialog module directly.
 */
const inlineDialog = () =>
	new rspack.NormalModuleReplacementPlugin(/^\.\/dialog-surface$/u, './dialog');

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
		tools: {
			rspack: {
				plugins: [
					// One file has no chunk to load on demand, and an inlined
					// `import()` only adds bytes: mount every module statically.
					new rspack.NormalModuleReplacementPlugin(
						/^\.\/create-runtime$/u,
						'./create-runtime-static'
					),
					inlineDialog(),
					...(IAB_BUNDLES.has(name) ? [] : [iabBundleBoundary()]),
					...(name === 'c15t' ? [modeBundleBoundary('hosted')] : []),
					...(name === 'c15t.offline' ? [modeBundleBoundary('offline')] : []),
				],
			},
		},
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
					devtools: './src/devtools.ts',
					gpp: './src/gpp.ts',
					headless: './src/headless.ts',
					hosted: './src/hosted.ts',
					iab: './src/iab.ts',
					index: './src/index.ts',
					offline: './src/offline.ts',
					'postcss-tailwind3': './src/postcss-tailwind3.ts',
				},
			},
		},
		scriptTagLib('c15t', './src/entries/cdn.ts'),
		scriptTagLib('c15t.offline', './src/entries/cdn-offline.ts'),
		scriptTagLib('c15t.headless', './src/entries/cdn-headless.ts'),
		scriptTagLib('c15t.iab', './src/entries/cdn-iab.ts'),
		scriptTagLib('c15t.devtools', './src/entries/cdn-devtools.ts'),
		scriptTagLib('c15t.gpp', './src/entries/cdn-gpp.ts'),
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
