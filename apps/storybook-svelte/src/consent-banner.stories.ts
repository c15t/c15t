import {
	bannerAcceptViaKeyboard,
	bannerContract,
	bannerFocusManagement,
	bannerToDialogFlow,
} from '@c15t/conformance/play/consent-banner';
import type { Meta, StoryObj } from '@storybook/svelte-vite';

import ConsentBannerStory from './ConsentBannerStory.svelte';

const meta = {
	component: ConsentBannerStory,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - SVELTE/Core/Consent Banner',
} satisfies Meta<ConsentBannerStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BannerContract: Story = {
	play: bannerContract,
};

export const BannerToDialogFlow: Story = {
	args: {
		includeDialog: true,
	},
	play: bannerToDialogFlow,
};

export const BannerAcceptViaKeyboard: Story = {
	play: bannerAcceptViaKeyboard,
};

export const BannerFocusManagement: Story = {
	args: {
		trapFocus: true,
	},
	play: bannerFocusManagement,
};
