import { keyboardNavigation, tabSwitching } from '@c15t/conformance/play/tabs';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import TabsControlledDemo from './TabsControlledDemo.svelte';
import TabsDemo from './TabsDemo.svelte';

const meta = {
	component: TabsDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'PRIMITIVES - SVELTE/Tabs',
} satisfies Meta<TabsDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: tabSwitching,
};

export const KeyboardNavigation: Story = {
	play: keyboardNavigation,
};

export const Controlled: Story = {
	// @ts-expect-error -- different component for this story
	component: TabsControlledDemo,
};
