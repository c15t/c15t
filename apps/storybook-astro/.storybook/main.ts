import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/html-vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
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
				// The preference-centre island is a `.svelte` file the
				// integration hands to the consuming app's build; here that
				// build is Storybook's.
				svelte(),
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
