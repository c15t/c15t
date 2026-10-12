import {
	dialogContract,
	dialogEscapeCloses,
	saveFlow,
} from '@c15t/conformance/play/consent-dialog';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import ConsentManager from '../../../packages/vue/src/runtime/components/manager.vue';
import ConsentBanner from '../../../packages/vue/src/runtime/components/prompt.vue';
import { useStorybookConsent as setupStorybookConsent } from './storybook-consent-fixtures';

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
			setupStorybookConsent('manager');
		},
		template: '<ConsentManager />',
	}),
};

export const DialogContract: Story = {
	play: dialogContract,
	render: () => ({
		components: { ConsentBanner, ConsentManager },
		setup() {
			setupStorybookConsent('banner');
		},
		template: '<ConsentBanner /><ConsentManager />',
	}),
};

export const SaveFlow: Story = {
	play: saveFlow,
	render: () => ({
		components: { ConsentBanner, ConsentManager },
		setup() {
			setupStorybookConsent('banner');
		},
		template: '<ConsentBanner /><ConsentManager />',
	}),
};

export const DialogEscapeCloses: Story = {
	play: dialogEscapeCloses,
	render: () => ({
		components: { ConsentBanner, ConsentManager },
		setup() {
			setupStorybookConsent('banner');
		},
		template: '<ConsentBanner /><ConsentManager />',
	}),
};
