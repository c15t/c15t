import {
	bannerAcceptViaKeyboard,
	bannerContract,
	bannerFocusManagement,
	bannerToDialogFlow,
} from '@c15t/conformance/play/consent-banner';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import ConsentBanner from '../../../packages/vue/src/runtime/components/consent-banner.vue';
import ConsentManager from '../../../packages/vue/src/runtime/components/consent-manager.vue';
import { useStorybookConsent as setupStorybookConsent } from './storybook-consent-fixtures';

const meta = {
	component: ConsentBanner,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - VUE/Core/Consent Banner',
} satisfies Meta<typeof ConsentBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: { ConsentBanner },
		setup() {
			setupStorybookConsent('banner');
		},
		template: '<ConsentBanner />',
	}),
};

export const BannerContract: Story = {
	play: bannerContract,
	render: () => ({
		components: { ConsentBanner },
		setup() {
			setupStorybookConsent('banner');
		},
		template: '<ConsentBanner />',
	}),
};

export const BannerToDialogFlow: Story = {
	play: bannerToDialogFlow,
	render: () => ({
		components: { ConsentBanner, ConsentManager },
		setup() {
			setupStorybookConsent('banner');
		},
		template: '<ConsentBanner /><ConsentManager />',
	}),
};

export const BannerAcceptViaKeyboard: Story = {
	play: bannerAcceptViaKeyboard,
	render: () => ({
		components: { ConsentBanner },
		setup() {
			setupStorybookConsent('banner');
		},
		template: '<ConsentBanner />',
	}),
};

export const BannerFocusManagement: Story = {
	play: bannerFocusManagement,
	render: () => ({
		components: { ConsentBanner },
		setup() {
			setupStorybookConsent('banner');
		},
		template: '<ConsentBanner />',
	}),
};
