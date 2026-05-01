import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const workspace = (...segments: string[]) =>
	path.resolve(storybookDir, '../../..', ...segments);
const ui = (...segments: string[]) => workspace('packages/ui/src', ...segments);

const config: StorybookConfig = {
	addons: ['@storybook/addon-a11y'],
	framework: '@storybook/react-vite',
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	viteFinal: async (config) =>
		mergeConfig(config, {
			esbuild: {
				jsx: 'automatic',
				jsxImportSource: 'react',
			},
			optimizeDeps: {
				include: [
					'react',
					'react-dom',
					'react/jsx-runtime',
					'react/jsx-dev-runtime',
					'react-dom/client',
				],
			},
			resolve: {
				alias: [
					{
						find: /^@c15t\/conformance\/(.*)$/,
						replacement: path.resolve(
							storybookDir,
							'../../../internals/conformance/src/$1'
						),
					},
					{
						find: '@c15t/react/primitives',
						replacement: workspace('packages/react/src/primitives.ts'),
					},
					{
						find: /^@c15t\/react$/,
						replacement: workspace('packages/react/src/index.ts'),
					},
					{
						find: /^@c15t\/iab$/,
						replacement: workspace('packages/iab/src/index.ts'),
					},
					{
						find: /^@c15t\/schema\/types$/,
						replacement: workspace('packages/schema/src/types.ts'),
					},
					{
						find: /^@c15t\/schema$/,
						replacement: workspace('packages/schema/src/index.ts'),
					},
					{
						find: /^c15t$/,
						replacement: workspace('packages/core/src/index.ts'),
					},
					{
						find: /^@iabtechlabtcf\/core$/,
						replacement: workspace(
							'packages/iab/node_modules/@iabtechlabtcf/core'
						),
					},
					{
						find: /^~\/(.*)$/,
						replacement: workspace('packages/react/src/$1'),
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
						find: /^@c15t\/ui\/styles\/primitives\/(.+)\.module\.js$/,
						replacement: ui('styles', 'primitives', '$1.module.css'),
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
						find: /^@c15t\/ui\/utils$/,
						replacement: ui('utils', 'index.ts'),
					},
					{
						find: /^@c15t\/ui\/utils\/(.+)$/,
						replacement: ui('utils', '$1.ts'),
					},
					{
						find: '@c15t/translations/all',
						replacement: workspace('packages/translations/src/all.ts'),
					},
					{
						find: /^@c15t\/translations$/,
						replacement: workspace('packages/translations/src/index.ts'),
					},
				],
			},
		}),
};

export default config;
