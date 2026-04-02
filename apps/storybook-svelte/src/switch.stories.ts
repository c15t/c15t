import {
	controlledToggle,
	toggleOnOff,
} from '@c15t/storybook-tests/play/switch';
import { enTranslations } from '@c15t/translations';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import SwitchControlledDemo from './SwitchControlledDemo.svelte';
import SwitchDemo from './SwitchDemo.svelte';
import SwitchSizesDemo from './SwitchSizesDemo.svelte';

const { consentTypes } = enTranslations;

const meta = {
	component: SwitchDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Switch',
} satisfies Meta<SwitchDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	args: {
		label: consentTypes.measurement.title,
	},
	play: toggleOnOff,
};

export const Checked: Story = {
	args: {
		defaultChecked: true,
		label: consentTypes.measurement.title,
	},
};

export const Controlled: Story = {
	args: {
		label: consentTypes.functionality.title,
	},
	// @ts-expect-error -- different component for this story
	component: SwitchControlledDemo,
	play: controlledToggle,
};

export const Disabled: Story = {
	args: {
		disabled: true,
		label: consentTypes.measurement.title,
	},
};

export const Sizes: Story = {
	args: {
		mediumLabel: consentTypes.necessary.title,
		smallLabel: consentTypes.functionality.title,
	},
	// @ts-expect-error -- different component for this story
	component: SwitchSizesDemo,
};
