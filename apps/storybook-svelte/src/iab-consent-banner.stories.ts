import { customizeFlow } from '@c15t/conformance/play/iab-consent-banner';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import IABConsentBannerStory from './IABConsentBannerStory.svelte';

const meta = {
	component: IABConsentBannerStory,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - SVELTE/IAB/IAB Consent Banner',
} satisfies Meta<IABConsentBannerStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomizeFlow: Story = {
	args: {
		includeDialog: true,
	},
	play: customizeFlow,
};
