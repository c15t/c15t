import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/vue3-vite';
import { mergeConfig } from 'vite';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const ui = (...segments: string[]) =>
	path.resolve(storybookDir, '../../../packages/ui/src', ...segments);

const config: StorybookConfig = {
	addons: ['@storybook/addon-a11y'],
	framework: '@storybook/vue3-vite',
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	viteFinal: async (config) =>
		mergeConfig(config, {
			resolve: {
				alias: [
					{
						find: /^@c15t\/storybook-tests\/(.*)$/,
						replacement: path.resolve(
							storybookDir,
							'../../../internals/storybook-tests/src/$1'
						),
					},
					{
						find: /^@c15t\/framework-vue$/,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/framework-vue/src/index.ts'
						),
					},
					// @c15t/ui — resolve all subpath imports to source
					{
						find: /^@c15t\/ui\/primitives\/data-state$/,
						replacement: ui('primitives', 'data-state.ts'),
					},
					{
						find: /^@c15t\/ui\/primitives\/(.+)$/,
						replacement: ui('primitives', '$1', 'index.ts'),
					},
					{
						find: /^@c15t\/ui\/primitives$/,
						replacement: ui('primitives', 'index.ts'),
					},
					{
						find: /^@c15t\/ui\/styles\/primitives\/(.+)$/,
						replacement: ui('styles', 'primitives', '$1.ts'),
					},
					{
						find: /^@c15t\/ui\/styles\/primitives$/,
						replacement: ui('styles', 'primitives', 'index.ts'),
					},
					{
						find: /^@c15t\/ui\/theme$/,
						replacement: ui('theme', 'index.ts'),
					},
					{
						find: /^@c15t\/ui\/utils\/(.+)$/,
						replacement: ui('utils', '$1.ts'),
					},
					{
						find: /^@c15t\/translations$/,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/translations/src/index.ts'
						),
					},
				],
			},
		}),
};

export default config;
