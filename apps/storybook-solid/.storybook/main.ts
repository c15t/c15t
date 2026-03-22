import type { StorybookConfig } from 'storybook-solidjs-vite';

const config: StorybookConfig = {
	addons: ['@storybook/addon-a11y'],
	framework: 'storybook-solidjs-vite',
	stories: ['../src/**/*.stories.@(ts|tsx)'],
};

export default config;
