import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
	addons: ['@storybook/addon-a11y'],
	framework: '@storybook/react-vite',
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	viteFinal: async (config) =>
		mergeConfig(config, {
			resolve: {
				alias: [
					{
						find: '@c15t/react/primitives',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/react/src/primitives.ts'
						),
					},
					{
						find: /^@c15t\/react$/,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/react/src/index.ts'
						),
					},
					{
						find: /^~\/(.*)$/,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/react/src/$1'
						),
					},
					{
						find: '@c15t/ui/theme',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/theme/index.ts'
						),
					},
					{
						find: '@c15t/ui/primitives/accordion',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/primitives/accordion/index.ts'
						),
					},
					{
						find: '@c15t/ui/primitives/collapsible',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/primitives/collapsible/index.ts'
						),
					},
					{
						find: '@c15t/ui/primitives/preference-item',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/primitives/preference-item/index.ts'
						),
					},
					{
						find: '@c15t/ui/primitives/dialog',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/primitives/dialog/index.ts'
						),
					},
					{
						find: '@c15t/ui/primitives/tabs',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/primitives/tabs/index.ts'
						),
					},
					{
						find: '@c15t/ui/primitives/switch',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/primitives/switch/index.ts'
						),
					},
					{
						find: '@c15t/ui/primitives/data-state',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/primitives/data-state.ts'
						),
					},
					{
						find: '@c15t/ui/styles/primitives/collapsible',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/styles/primitives/collapsible.ts'
						),
					},
					{
						find: '@c15t/ui/styles/primitives/preference-item',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/styles/primitives/preference-item.ts'
						),
					},
					{
						find: '@c15t/ui/styles/primitives/button',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/styles/primitives/button.ts'
						),
					},
					{
						find: '@c15t/ui/styles/primitives/accordion',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/styles/primitives/accordion.ts'
						),
					},
					{
						find: '@c15t/ui/styles/primitives/switch',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/styles/primitives/switch.ts'
						),
					},
					{
						find: '@c15t/ui/styles/primitives/tabs',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/styles/primitives/tabs.ts'
						),
					},
					{
						find: /^@c15t\/ui\/styles\/components\/(.*)\.module\.js$/,
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/styles/components/$1.module.css'
						),
					},
					{
						find: '@c15t/ui/utils/dom',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/ui/src/utils/dom.ts'
						),
					},
					{
						find: '@c15t/translations/all',
						replacement: path.resolve(
							storybookDir,
							'../../../packages/translations/src/all.ts'
						),
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
