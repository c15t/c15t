import type { Meta, StoryObj } from '@storybook/svelte-vite';
import FrameStory from './FrameStory.svelte';

const meta = {
	component: FrameStory,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - SVELTE/Core/Frame',
} satisfies Meta<FrameStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};

export const GrantedContent: Story = {
	args: {
		granted: true,
	},
};
