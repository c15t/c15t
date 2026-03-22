import type { StorybookConfig } from '@storybook/svelte-vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mergeConfig } from 'vite';

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
		}),
};

export default config;
