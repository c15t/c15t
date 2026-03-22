import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
	addons: ['@storybook/addon-a11y'],
	framework: '@storybook/vue3-vite',
	stories: ['../src/**/*.stories.@(ts|tsx)'],
};

export default config;
