import {
	switchIndependentOfTrigger,
	triggerExpandsContent,
} from '@c15t/conformance/play/preference-item';
import { enTranslations } from '@c15t/translations';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import PreferenceItemDemo from './PreferenceItemDemo.svelte';

const { consentTypes } = enTranslations;

const meta = {
	component: PreferenceItemDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'PRIMITIVES - SVELTE/Preference Item',
} satisfies Meta<PreferenceItemDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TriggerOnly: Story = {
	args: {
		description: consentTypes.necessary.description,
		meta: 'Required',
		title: consentTypes.necessary.title,
	},
	play: triggerExpandsContent,
};

export const WithTrailingSwitch: Story = {
	args: {
		defaultChecked: true,
		defaultOpen: true,
		description: consentTypes.measurement.description,
		meta: '4 partners',
		title: consentTypes.measurement.title,
		withSwitch: true,
	},
	play: switchIndependentOfTrigger,
};

export const DisabledControl: Story = {
	args: {
		defaultOpen: true,
		description:
			'Used to understand whether advertising campaigns lead to useful outcomes.',
		disabled: true,
		meta: '6 partners',
		title: 'Advertising measurement',
		withSwitch: true,
	},
};
