import { tabSwitchFlow } from '@c15t/conformance/play/iab-consent-dialog';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import IabConsentDialog from '../../../packages/vue/src/runtime/components/iab-consent-dialog.vue';
import { useStorybookIABConsent as setupStorybookIABConsent } from './storybook-consent-fixtures';

const meta = {
	component: IabConsentDialog,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - VUE/IAB/IAB Consent Dialog',
} satisfies Meta<typeof IabConsentDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	render: () => ({
		components: { IabConsentDialog },
		setup() {
			setupStorybookIABConsent('manager');
		},
		template: '<IabConsentDialog />',
	}),
};

/**
 * The shallower flow: Vue's vendor list has no expandable rows yet, so it
 * cannot run `tabAndExpansionFlow` the way React and Svelte do.
 */
export const TabSwitchFlow: Story = {
	play: tabSwitchFlow,
	render: () => ({
		components: { IabConsentDialog },
		setup() {
			setupStorybookIABConsent('manager');
		},
		template: '<IabConsentDialog />',
	}),
};
