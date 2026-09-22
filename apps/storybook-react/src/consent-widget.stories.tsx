import {
	expandedCategories,
	expandedVendors,
} from '@c15t/conformance/play/consent-widget';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsentWidget } from '../../../packages/react/src/index';
import {
	storybookVendors,
	storybookVendorStoredConsent,
} from '../../storybook-consent-policy';
import {
	editableConsentOptions,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

const meta = {
	component: ConsentWidget,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - REACT/Core/Consent Widget',
} satisfies Meta<typeof ConsentWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={{
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			}}
		>
			<div style={{ width: '32rem' }}>
				<ConsentWidget />
			</div>
		</StorybookConsentProvider>
	),
};

export const ExpandedCategories: Story = {
	...Default,
	play: expandedCategories,
};

/** Vendors nested under their categories. Expand Marketing to see two cards. */
export const WithVendors: Story = {
	render: () => (
		<StorybookConsentProvider
			options={{ ...editableConsentOptions, vendors: storybookVendors }}
			storedConsent={storybookVendorStoredConsent}
		>
			<div style={{ width: '32rem' }}>
				<ConsentWidget />
			</div>
		</StorybookConsentProvider>
	),
};

/** Marketing and one vendor card open, the vendor turned off in the draft. */
export const WithVendorsExpanded: Story = {
	...WithVendors,
	play: expandedVendors,
};
