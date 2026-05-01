import { saveFlow } from '@c15t/conformance/play/consent-dialog';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import ConsentDialogStory from './ConsentDialogStory.svelte';

const meta = {
	component: ConsentDialogStory,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - SVELTE/Core/Consent Dialog',
} satisfies Meta<ConsentDialogStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		open: true,
		useStoredConsent: true,
	},
};

export const SaveFlow: Story = {
	args: {
		withBanner: true,
	},
	play: saveFlow,
};
