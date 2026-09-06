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
	// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
	viteFinal: async (configLocal) =>
		mergeConfig(configLocal, {
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
						find: /^@c15t\/conformance\/(?<capture1>.*)$/u,
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
						find: /^@c15t\/react$/u,
						replacement: workspace('packages/react/src/index.ts'),
					},
					{
						find: /^@c15t\/iab$/u,
						replacement: workspace('packages/iab/src/index.ts'),
					},
					{
						find: /^@c15t\/schema\/types$/u,
						replacement: workspace('packages/schema/src/types.ts'),
					},
					{
						find: /^@c15t\/schema$/u,
						replacement: workspace('packages/schema/src/index.ts'),
					},
					{
						find: /^c15t$/u,
						replacement: workspace('packages/core/src/index.ts'),
					},
					{
						find: /^@iabtechlabtcf\/core$/u,
						replacement: workspace(
							'packages/iab/node_modules/@iabtechlabtcf/core'
						),
					},
					{
						find: /^~\/(?<capture1>.*)$/u,
						replacement: workspace('packages/react/src/$1'),
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
						find: /^@c15t\/ui\/styles\/primitives\/(.+)\.module\.js$/u,
						replacement: ui('styles', 'primitives', '$1.module.css'),
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
						find: /^@c15t\/ui\/utils$/u,
						replacement: ui('utils', 'index.ts'),
					},
					{
						// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
						find: /^@c15t\/ui\/utils\/(.+)$/u,
						replacement: ui('utils', '$1.ts'),
					},
					{
						find: '@c15t/translations/all',
						replacement: workspace('packages/translations/src/all.ts'),
					},
					{
						find: /^@c15t\/translations$/u,
						replacement: workspace('packages/translations/src/index.ts'),
					},
				],
			},
		}),
};

export default config;
