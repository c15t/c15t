import {
	expandedCategories,
	expandedVendors,
} from '@c15t/conformance/play/consent-widget';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import ConsentWidget from '../../../packages/vue/src/runtime/components/preferences.vue';
import {
	storybookVendors,
	storybookVendorStoredConsent,
} from '../../storybook-consent-policy';
import {
	storybookInit,
	useStorybookConsent as setupStorybookConsent,
} from './storybook-consent-fixtures';

const meta = {
	component: ConsentWidget,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - VUE/Core/Consent Widget',
} satisfies Meta<typeof ConsentWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: { ConsentWidget },
		setup() {
			setupStorybookConsent(null);
		},
		template: '<div style="width: 32rem;"><ConsentWidget /></div>',
	}),
};

export const ExpandedCategories: Story = {
	play: expandedCategories,
	render: () => ({
		components: { ConsentWidget },
		setup() {
			setupStorybookConsent(null);
		},
		template: '<div style="width: 32rem;"><ConsentWidget /></div>',
	}),
};

/** Vendors nested under their categories. Expand Marketing to see two cards. */
export const WithVendors: Story = {
	render: () => ({
		components: { ConsentWidget },
		setup() {
			setupStorybookConsent(
				null,
				{ vendors: storybookVendors },
				storybookInit,
				storybookVendorStoredConsent
			);
		},
		template: '<div style="width: 32rem;"><ConsentWidget /></div>',
	}),
};

/** Marketing and one vendor card open, the vendor turned off in the draft. */
export const WithVendorsExpanded: Story = {
	...WithVendors,
	play: expandedVendors,
};
