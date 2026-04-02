import {
	keyboardNavigation,
	tabSwitching,
} from '@c15t/storybook-tests/play/tabs';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import TabsDemo from './TabsDemo.svelte';

const meta = {
	component: TabsDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Tabs',
} satisfies Meta<TabsDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: tabSwitching,
};

export const KeyboardNavigation: Story = {
	play: keyboardNavigation,
};
