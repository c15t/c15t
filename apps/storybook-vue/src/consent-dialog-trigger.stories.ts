import { dialogFocusManagement } from '@c15t/conformance/play/consent-dialog';
import { triggerOpensDialog } from '@c15t/conformance/play/consent-dialog-trigger';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import ConsentDialogTrigger from '../../../packages/vue/src/runtime/components/consent-dialog-trigger.vue';
import ConsentManager from '../../../packages/vue/src/runtime/components/consent-manager.vue';
import { useStorybookConsent as setupStorybookConsent } from './storybook-consent-fixtures';

const meta = {
	component: ConsentDialogTrigger,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - VUE/Core/Consent Dialog Trigger',
} satisfies Meta<typeof ConsentDialogTrigger>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: triggerOpensDialog,
	render: () => ({
		components: { ConsentDialogTrigger, ConsentManager },
		setup() {
			setupStorybookConsent(null, {
				triggerIcon: 'branding',
				triggerShowWhen: 'always',
			});
		},
		template: '<ConsentManager /><ConsentDialogTrigger />',
	}),
};

export const DialogFocusManagement: Story = {
	play: dialogFocusManagement,
	render: () => ({
		components: { ConsentDialogTrigger, ConsentManager },
		setup() {
			setupStorybookConsent(null, {
				triggerIcon: 'branding',
				triggerShowWhen: 'always',
			});
		},
		template: '<ConsentManager /><ConsentDialogTrigger />',
	}),
};
