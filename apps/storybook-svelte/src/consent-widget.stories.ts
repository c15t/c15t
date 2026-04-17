import { expandedCategories } from '@c15t/conformance/play/consent-widget';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import ConsentWidgetStory from './ConsentWidgetStory.svelte';

const meta = {
	component: ConsentWidgetStory,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - SVELTE/Core/Consent Widget',
} satisfies Meta<ConsentWidgetStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExpandedCategories: Story = {
	play: expandedCategories,
};
