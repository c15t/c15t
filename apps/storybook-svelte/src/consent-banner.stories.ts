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

export const Notice: Story = {
	args: {
		notice: true,
	},
};

/** Full-width edge bar pinned to the bottom of the viewport. */
export const Bar: Story = {
	args: {
		includeDialog: true,
		variant: 'bar',
	},
};

/** Compact chip in the bottom-right corner. */
export const Widget: Story = {
	args: {
		includeDialog: true,
		variant: 'widget',
	},
};

/** Centered blocking prompt: backdrop, scroll lock and focus trap. */
export const Wall: Story = {
	args: {
		includeDialog: true,
		variant: 'wall',
	},
};

/** The default card moved to the bottom center. */
export const FloatingBottomCenter: Story = {
	args: {
		includeDialog: true,
		position: 'bottom-center',
		variant: 'floating',
	},
};

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
