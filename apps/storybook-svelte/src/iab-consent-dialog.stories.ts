import { tabAndExpansionFlow } from '@c15t/storybook-tests/play/iab-consent-dialog';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import IABConsentDialogStory from './IABConsentDialogStory.svelte';

const meta = {
	component: IABConsentDialogStory,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - SVELTE/IAB/IAB Consent Dialog',
} satisfies Meta<IABConsentDialogStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const TabAndExpansionFlow: Story = {
	play: tabAndExpansionFlow,
};
