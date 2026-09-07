import {
	bannerAcceptViaKeyboard,
	bannerContract,
	bannerFocusManagement,
	bannerToDialogFlow,
} from '@c15t/conformance/play/consent-banner';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import ConsentBanner from '../../../packages/vue/src/runtime/components/consent-banner.vue';
import ConsentManager from '../../../packages/vue/src/runtime/components/consent-manager.vue';
import {
	storybookNoticeInit,
	useStorybookConsent as setupStorybookConsent,
} from './storybook-consent-fixtures';

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

/** Opt-out notice: dismiss plus the opt-out and preferences links. */
export const Notice: Story = {
	render: () => ({
		components: { ConsentBanner, ConsentManager },
		setup() {
			setupStorybookConsent('banner', undefined, storybookNoticeInit);
		},
		template: '<ConsentBanner /><ConsentManager />',
	}),
};

/** Full-width edge bar, the default shape for a notice. */
export const Bar: Story = {
	render: () => ({
		components: { ConsentBanner, ConsentManager },
		setup() {
			setupStorybookConsent('banner', undefined, storybookNoticeInit);
		},
		template: '<ConsentBanner variant="bar" /><ConsentManager />',
	}),
};

/** Compact corner chip for a choice prompt. */
export const Widget: Story = {
	render: () => ({
		components: { ConsentBanner, ConsentManager },
		setup() {
			setupStorybookConsent('banner');
		},
		template: '<ConsentBanner variant="widget" /><ConsentManager />',
	}),
};

/** Centered blocking prompt: backdrop, scroll lock and focus trap. */
export const Wall: Story = {
	render: () => ({
		components: { ConsentBanner, ConsentManager },
		setup() {
			setupStorybookConsent('banner');
		},
		template: '<ConsentBanner variant="wall" /><ConsentManager />',
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
