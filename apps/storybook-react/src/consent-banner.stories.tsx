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
} from '../../../packages/react/src/index';
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

export const BannerContract: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner />
		</StorybookConsentProvider>
	),
	play: bannerContract,
};

export const BannerToDialogFlow: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
	play: bannerToDialogFlow,
};

export const BannerAcceptViaKeyboard: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner />
		</StorybookConsentProvider>
	),
	play: bannerAcceptViaKeyboard,
};

export const BannerFocusManagement: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner trapFocus />
		</StorybookConsentProvider>
	),
	play: bannerFocusManagement,
};
