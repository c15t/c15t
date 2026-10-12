import {
	expandedCategories,
	expandedVendors,
} from '@c15t/conformance/play/consent-widget';
import type { Meta, StoryObj } from '@storybook/svelte-vite';

import ConsentWidgetVendorsStory from './consent-widget-vendors-story.svelte';
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

/** Vendors nested under their categories. Expand Marketing to see two cards. */
export const WithVendors: Story = {
	render: () => ({ Component: ConsentWidgetVendorsStory }),
};

/** Marketing and one vendor card open, the vendor turned off in the draft. */
export const WithVendorsExpanded: Story = {
	...WithVendors,
	play: expandedVendors,
};
