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
	viteFinal: (configLocal) =>
		mergeConfig(configLocal, {
			plugins: [svelte()],
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
						find: /^c15t$/u,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/core/src/index.ts'
						),
					},
					{
						find: /^~\/(?<capture1>.+)$/u,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/core/src/$1'
						),
					},
					{
						find: /^@c15t\/svelte$/u,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/svelte/src/lib/index.ts'
						),
					},
					{
						find: /^@c15t\/ui\/primitives\/data-state$/u,
						replacement: ui('primitives', 'data-state.ts'),
					},
					{
						find: /^@c15t\/ui\/primitives\/(?<capture1>.+)$/u,
						replacement: ui('primitives', '$1', 'index.ts'),
					},
					{
						find: /^@c15t\/ui\/primitives$/u,
						replacement: ui('primitives', 'index.ts'),
					},
					{
						find: /^@c15t\/ui\/styles\/primitives\/(?<capture1>.+)\.module\.js$/u,
						replacement: ui('styles', 'primitives', '$1.module.css'),
					},
					{
						find: /^@c15t\/ui\/styles\/primitives\/(?<capture1>.+)$/u,
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
						find: /^@c15t\/ui\/utils\/(?<capture1>.+)$/u,
						replacement: ui('utils', '$1.ts'),
					},
					{
						find: /^@c15t\/translations$/u,
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
