import { triggerOpensDialog } from '@c15t/storybook-tests/play/consent-dialog-trigger';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import ConsentDialogTriggerStory from './ConsentDialogTriggerStory.svelte';

const meta = {
	component: ConsentDialogTriggerStory,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - SVELTE/Core/Consent Dialog Trigger',
} satisfies Meta<ConsentDialogTriggerStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: triggerOpensDialog,
};

export const Mobile: Story = {
	args: {
		defaultPosition: 'bottom-left',
		size: 'sm',
	},
	parameters: {
		viewport: {
			defaultViewport: 'mobile1',
		},
	},
};
