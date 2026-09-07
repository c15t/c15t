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
 * A notice prompt under an opt-out model: a primary "Accept All" that records
 * a dismissal, beside an underlined "Do not sell or share my data" text control that
 * opens the preference center.
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

/** Full-width edge bar pinned to the bottom of the viewport. */
export const Bar: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner variant="bar" />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
};

/** Compact chip in the bottom-right corner. */
export const Widget: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner variant="widget" />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
};

/** Centered blocking prompt: backdrop, scroll lock and focus trap. */
export const Wall: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner variant="wall" />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
};

/** The default card moved to the bottom center. */
export const FloatingBottomCenter: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner
				variant="floating"
				position="bottom-center"
			/>
			<ConsentDialog />
		</StorybookConsentProvider>
	),
};
