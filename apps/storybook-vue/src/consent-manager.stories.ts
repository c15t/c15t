import { saveFlow } from '@c15t/conformance/play/consent-dialog';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ConsentBanner from '../../../packages/vue/src/runtime/components/consent-banner.vue';
import ConsentManager from '../../../packages/vue/src/runtime/components/consent-manager.vue';
import { useStorybookConsent } from './storybook-consent-fixtures';

const meta = {
	component: ConsentManager,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - VUE/Core/Consent Dialog',
} satisfies Meta<typeof ConsentManager>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: { ConsentManager },
		setup() {
			useStorybookConsent('manager');
		},
		template: '<ConsentManager />',
	}),
};

export const SaveFlow: Story = {
	play: saveFlow,
	render: () => ({
		components: { ConsentBanner, ConsentManager },
		setup() {
			useStorybookConsent('banner');
		},
		template: '<ConsentBanner /><ConsentManager />',
	}),
};
