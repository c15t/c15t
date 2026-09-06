import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/html-vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { mergeConfig } from 'vite';

import { astroStoryVariants } from '../src/story-variants.ts';
import { astroPrerender } from './astro-prerender.ts';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const workspace = (...segments: string[]) =>
	path.resolve(storybookDir, '../../..', ...segments);

const config: StorybookConfig = {
	addons: ['@storybook/addon-a11y'],
	framework: {
		name: '@storybook/html-vite',
		options: {},
	},
	stories: ['../src/**/*.stories.@(ts|js)'],
	viteFinal: (configLocal) =>
		mergeConfig(configLocal, {
			plugins: [
				astroPrerender(astroStoryVariants),
				// The dialog islands are `.svelte`, `.tsx` and `.vue` files the
				// integration hands to the consuming app's build; here that
				// build is Storybook's, and it compiles all three so one story
				// per adapter can prove the adapter still mounts.
				svelte(),
				vue(),
				react({ include: /\.(?:jsx|tsx)$/u }),
			],
			resolve: {
				alias: [
					{
						find: /^@c15t\/conformance\/(?<capture1>.*)$/u,
						replacement: workspace('internals/conformance/src/$1'),
					},
					// `@c15t/astro` is consumed through its published entrypoints
					// so the Storybook exercises the same client boot, adapter and
					// island a real site loads.
					{
						find: /^@c15t\/svelte$/u,
						replacement: workspace('packages/svelte/src/lib/index.ts'),
					},
					// The Vue island reaches the Nuxt auto-import shims through
					// the same stubs the Vue Storybook uses; nothing here runs
					// under Nuxt.
					{
						find: /^#imports$/u,
						replacement: workspace('packages/vue/src/runtime/vue/stubs.ts'),
					},
					{
						find: /^#c15t\/composables$/u,
						replacement: workspace(
							'packages/vue/src/runtime/composables/index.ts'
						),
					},
					{
						find: /^@c15t\/vue\/vue-plugin$/u,
						replacement: workspace('packages/vue/src/index.ts'),
					},
					{
						find: /^@c15t\/vue\/runtime\/(?<capture2>.*)$/u,
						replacement: workspace('packages/vue/src/runtime/$1'),
					},
					// `@c15t/react` imports its own sources through `~/`.
					{
						find: /^~\/(?<capture1>.*)$/u,
						replacement: workspace('packages/react/src/$1'),
					},
					{
						find: /^@c15t\/react$/u,
						replacement: workspace('packages/react/src/index.ts'),
					},
					{
						find: /^@c15t\/react\/iab$/u,
						replacement: workspace('packages/react/src/iab.ts'),
					},
					{
						find: /^c15t$/u,
						replacement: workspace('packages/core/src/index.ts'),
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
