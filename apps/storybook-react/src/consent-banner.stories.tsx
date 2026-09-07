import {
	bannerAcceptViaKeyboard,
	bannerContract,
	bannerFocusManagement,
	bannerToDialogFlow,
} from '@c15t/conformance/play/consent-banner';
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	ConsentBanner,
	ConsentDialog,
	offline,
} from '../../../packages/react/src/index';
import { storybookPolicy } from '../../storybook-consent-policy';
import {
	editableConsentOptions,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

const meta = {
	component: ConsentBanner,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - REACT/Core/Consent Banner',
} satisfies Meta<typeof ConsentBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner />
		</StorybookConsentProvider>
	),
};

export const BannerToDialogFlow: Story = {
	play: bannerToDialogFlow,
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
};

export const BannerContract: Story = { ...Default, play: bannerContract };
export const BannerAcceptViaKeyboard: Story = {
	...Default,
	play: bannerAcceptViaKeyboard,
};
export const BannerFocusManagement: Story = {
	play: bannerFocusManagement,
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner trapFocus />
		</StorybookConsentProvider>
	),
};

/**
 * A notice prompt under an opt-out model: one dismiss action plus links for
 * the opt-out and preferences rights the prompt leaves uncovered.
 */
export const Notice: Story = {
	render: () => (
		<StorybookConsentProvider
			options={{
				...editableConsentOptions,
				mode: offline({
					policyRules: [
						{
							...storybookPolicy,
							id: 'storybook-notice',
							model: 'opt-out',
							prompt: 'notice',
						},
					],
				}),
				presentation: undefined,
			}}
		>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
};
