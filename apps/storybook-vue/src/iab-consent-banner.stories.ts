import { customizeFlow } from '@c15t/conformance/play/iab-consent-banner';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import IabConsentBanner from '../../../packages/vue/src/runtime/components/iab-consent-banner.vue';
import IabConsentDialog from '../../../packages/vue/src/runtime/components/iab-consent-dialog.vue';
import { useStorybookIABConsent as setupStorybookIABConsent } from './storybook-consent-fixtures';

const meta = {
	component: IabConsentBanner,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - VUE/IAB/IAB Consent Banner',
} satisfies Meta<typeof IabConsentBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: { IabConsentBanner },
		setup() {
			setupStorybookIABConsent('banner');
		},
		template: '<IabConsentBanner />',
	}),
};

export const CustomizeFlow: Story = {
	play: customizeFlow,
	render: () => ({
		components: { IabConsentBanner, IabConsentDialog },
		setup() {
			setupStorybookIABConsent('banner');
		},
		template: '<IabConsentBanner /><IabConsentDialog />',
	}),
};
