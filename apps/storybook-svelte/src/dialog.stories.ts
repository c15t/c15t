import { escCloses, openAndClose } from '@c15t/storybook-tests/play/dialog';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import DialogControlledDemo from './DialogControlledDemo.svelte';
import DialogDemo from './DialogDemo.svelte';

const meta = {
	component: DialogDemo,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'PRIMITIVES - SVELTE/Dialog',
} satisfies Meta<DialogDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: openAndClose,
};

export const EscapeCloses: Story = {
	play: escCloses,
};

export const Controlled: Story = {
	// @ts-expect-error -- different component for this story
	component: DialogControlledDemo,
};
