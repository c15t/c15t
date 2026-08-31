import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { StorybookConfig } from '@storybook/vue3-vite';
import { mergeConfig } from 'vite';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(storybookDir, '../../..');
const require = createRequire(import.meta.url);
const vuePackage = (...segments: string[]) =>
	path.resolve(repoRoot, 'packages/vue/src', ...segments);
const core = (...segments: string[]) =>
	path.resolve(repoRoot, 'packages/core/src', ...segments);
const ui = (...segments: string[]) =>
	path.resolve(repoRoot, 'packages/ui/src', ...segments);

const config: StorybookConfig = {
	addons: ['@storybook/addon-a11y'],
	framework: '@storybook/vue3-vite',
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	viteFinal: async (configLocal) => {
		const vuePluginPath = require.resolve('@vitejs/plugin-vue', {
			paths: [path.resolve(repoRoot, 'packages/vue')],
		});
		const { default: vue } = await import(pathToFileURL(vuePluginPath).href);

		return mergeConfig(configLocal, {
			plugins: [vue()],
			resolve: {
				alias: [
					{
						find: /^#imports$/u,
						replacement: vuePackage('runtime', 'vue', 'stubs.ts'),
					},
					{
						find: /^#c15t\/composables$/u,
						replacement: vuePackage('runtime', 'composables', 'index.ts'),
					},
					{
						find: /^c15t\/v3\/modules\/script-loader$/u,
						replacement: core('v3', 'modules', 'script-loader', 'index.ts'),
					},
					{
						find: /^c15t\/v3\/modules\/network-blocker$/u,
						replacement: core('v3', 'modules', 'network-blocker', 'index.ts'),
					},
					{
						find: /^c15t\/v3\/modules\/iframe-blocker$/u,
						replacement: core('v3', 'modules', 'iframe-blocker', 'index.ts'),
					},
					{
						find: /^c15t\/v3\/modules\/persistence$/u,
						replacement: core('v3', 'modules', 'persistence', 'index.ts'),
					},
					{
						find: /^c15t\/v3\/consent-record$/u,
						replacement: core('v3', 'consent-record', 'index.ts'),
					},
					{
						find: /^c15t\/v3$/u,
						replacement: core('v3', 'index.ts'),
					},
					{
						find: /^@c15t\/conformance\/(?<capture1>.*)$/u,
						replacement: path.resolve(repoRoot, 'internals/conformance/src/$1'),
					},
					{
						find: /^@c15t\/vue$/u,
						replacement: vuePackage('index.ts'),
					},
					// @c15t/ui — resolve all subpath imports to source
					{
						find: /^@c15t\/ui\/primitives\/data-state$/u,
						replacement: ui('primitives', 'data-state.ts'),
					},
					{
						// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
						find: /^@c15t\/ui\/primitives\/(.+)$/u,
						replacement: ui('primitives', '$1', 'index.ts'),
					},
					{
						find: /^@c15t\/ui\/primitives$/u,
						replacement: ui('primitives', 'index.ts'),
					},
					{
						// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
						find: /^@c15t\/ui\/styles\/primitives\/(.+)$/u,
						replacement: ui('styles', 'primitives', '$1.ts'),
					},
					{
						find: /^@c15t\/ui\/styles\/primitives$/u,
						replacement: ui('styles', 'primitives', 'index.ts'),
					},
					{
						find: /^@c15t\/ui\/theme$/u,
						replacement: ui('theme', 'index.ts'),
					},
					{
						// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
						find: /^@c15t\/ui\/utils\/(.+)$/u,
						replacement: ui('utils', '$1.ts'),
					},
					{
						find: /^@c15t\/translations$/u,
						replacement: path.resolve(
							repoRoot,
							'packages/translations/src/index.ts'
						),
					},
					{
						find: /^@c15t\/schema\/types$/u,
						replacement: path.resolve(repoRoot, 'packages/schema/src/types.ts'),
					},
					{
						find: /^@c15t\/schema\/config$/u,
						replacement: path.resolve(
							repoRoot,
							'packages/schema/src/config/index.ts'
						),
					},
					{
						find: /^@c15t\/schema$/u,
						replacement: path.resolve(repoRoot, 'packages/schema/src/index.ts'),
					},
				],
			},
		});
	},
};

export default config;
