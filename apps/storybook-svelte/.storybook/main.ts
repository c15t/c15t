import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/svelte-vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mergeConfig } from 'vite';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const ui = (...segments: string[]) =>
	path.resolve(storybookDir, '../../../packages/ui/src', ...segments);

const config: StorybookConfig = {
	addons: ['@storybook/addon-a11y'],
	framework: {
		name: '@storybook/svelte-vite',
		options: {
			docgen: false,
		},
	},
	stories: ['../src/**/*.stories.@(ts|js)'],
	viteFinal: async (config) =>
		mergeConfig(config, {
			plugins: [svelte()],
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
						find: /^c15t$/,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/core/src/index.ts'
						),
					},
					{
						find: /^~\/(.+)$/,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/core/src/$1'
						),
					},
					{
						find: /^@c15t\/svelte$/,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/svelte/src/lib/index.ts'
						),
					},
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
