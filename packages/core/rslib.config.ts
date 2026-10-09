import { createRequire } from 'node:module';

import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

import {
	compactModuleMinify,
	publicEntryAliases,
} from '../shared/rslib-modules';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

/**
 * Chunks `clientMode()` loads with `import()`. Each is bundled with every
 * module it imports, so a page's lazy chunk shares no module with its
 * first-load graph: Rolldown (Vite 8) splits shared modules out of the
 * page's chunk into many small ones. Per-language translations stay
 * external, so a resolver loads only the language it needs.
 */
const selfContainedEntries = {
	'runtime/lazy-hosted': './src/runtime/lazy-hosted.ts',
	'runtime/lazy-manifest-browser': './src/runtime/lazy-manifest-browser.ts',
};

// `tsconfig.json` maps these packages to their type declarations for the
// bundleless build, which leaves them external. A bundle needs the code.
const require = createRequire(import.meta.url);
const bundledPackages = {
	'@c15t/schema/types$': require.resolve('@c15t/schema/types'),
	'@c15t/translations$': require.resolve('@c15t/translations'),
	'@c15t/translations/all$': require.resolve('@c15t/translations/all'),
	'@c15t/translations/en$': require.resolve('@c15t/translations/en'),
};

/**
 * One entry, bundled into one file: a lib per entry, so no two share a
 * chunk, and `import()` inside the bundle stays in the same file.
 */
const selfContainedLib = function selfContainedLib(
	name: string,
	entry: string
) {
	return {
		autoExternal: false,
		bundle: true,
		dts: false,
		format: 'esm' as const,
		output: {
			// The bundleless build owns `dist`; cleaning it here races that
			// build's output.
			cleanDistPath: false,
			distPath: { root: './dist' },
			externals: [/^@c15t\/translations\/(?!en$)[a-z]{2}$/u],
			filename: { js: '[name].js' },
		},
		resolve: {
			alias: bundledPackages,
			aliasStrategy: 'prefer-alias' as const,
		},
		source: { entry: { [name]: entry } },
		tools: { rspack: { output: { asyncChunks: false } } },
	};
};

export default defineConfig({
	lib: [
		{
			bundle: false,
			dts: {
				distPath: './dist-types',
			},
			format: 'esm',
			outBase: './src',
			plugins: [
				publicEntryAliases({
					'clear-on-revocation.js': './modules/clear-on-revocation/index.js',
					'consent-categories.js': './consent-record/types.js',
					'consent-record.js': './consent-record/index.js',
					'generate-subject-id.js': './libs/generate-subject-id.js',
					'iframe-blocker.js': './modules/iframe-blocker/index.js',
					'network-blocker.js': './modules/network-blocker/index.js',
					'network-hold.js': './modules/network-blocker/hold.js',
					'persistence.js': './modules/persistence/index.js',
					'preference-draft.js': './preference-draft/index.js',
					'runtime.js': './runtime/index.js',
					'script-loader.js': './modules/script-loader/index.js',
					'server.js': './server/index.js',
					'transport-manifest-cache.js': './transports/manifest-cache.js',
					'transport-manifest.js': './transports/manifest.js',
					'transports.js': './transports/index.js',
					'window-debug.js': './modules/window-debug/index.js',
				}),
			],
			source: {
				entry: {
					index: [
						'./src/**/*.ts',
						'!./src/**/__tests__/**',
						'!./src/**/*.test.ts',
						'!./src/**/*.spec.ts',
						...Object.values(selfContainedEntries).map((entry) => `!${entry}`),
					],
				},
			},
		},
		...Object.entries(selfContainedEntries).map(([name, entry]) =>
			selfContainedLib(name, entry)
		),
	],
	output: {
		cleanDistPath: true,
		minify: compactModuleMinify,
		target: 'web',
	},
	performance: {
		// Temporary workaround for rspack persistent-cache panics in local builds.
		buildCache: false,
	},
	plugins: [pluginReact()],
	source: {
		exclude: [
			'**/__tests__/**',
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
			'**/*.browser.test.ts',
		],
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
