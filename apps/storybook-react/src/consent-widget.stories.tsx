import { expandedCategories } from '@c15t/conformance/play/consent-widget';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsentWidget } from '../../../packages/react/src/index';
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

/** Vendors nested under their categories. Expand Marketing to see two rows. */
export const WithVendors: Story = {
	render: () => (
		<StorybookConsentProvider
			options={{
				...editableConsentOptions,
				vendors: [
					{
						category: 'marketing',
						description: 'Ad conversion measurement and audiences.',
						id: 'meta-pixel',
						name: 'Meta Pixel',
						privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
					},
					{
						category: 'marketing',
						id: 'google-ads',
						name: 'Google Ads',
						privacyPolicyUrl: 'https://policies.google.com/privacy',
					},
					{
						category: 'measurement',
						id: 'google-analytics',
						name: 'Google Analytics',
						privacyPolicyUrl: 'https://policies.google.com/privacy',
					},
				],
			}}
			storedConsent={{
				experience: false,
				functionality: false,
				marketing: true,
				measurement: true,
				necessary: true,
			}}
		>
			<div style={{ width: '32rem' }}>
				<ConsentWidget />
			</div>
		</StorybookConsentProvider>
	),
};
