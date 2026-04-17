import { buttonRenders } from '@c15t/conformance/play/button';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import ButtonAllModesDemo from './ButtonAllModesDemo.svelte';
import ButtonDemo from './ButtonDemo.svelte';
import ButtonWithIconDemo from './ButtonWithIconDemo.svelte';

const meta = {
	component: ButtonDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'PRIMITIVES - SVELTE/Button',
} satisfies Meta<ButtonDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	play: buttonRenders,
};

export const WithIcon: Story = {
	// @ts-expect-error -- different component for this story
	component: ButtonWithIconDemo,
};

export const NeutralGhost: Story = {
	args: {
		label: 'Secondary action',
		mode: 'ghost',
		variant: 'neutral',
	},
};

export const AllModes: Story = {
	// @ts-expect-error -- different component for this story
	component: ButtonAllModesDemo,
};
