import {
	startsClosedByDefault,
	toggleOpenClose,
} from '@c15t/conformance/play/collapsible';
import { enTranslations } from '@c15t/translations';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import CollapsibleDemo from './CollapsibleDemo.svelte';

const { consentTypes } = enTranslations;

const meta = {
	component: CollapsibleDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'PRIMITIVES - SVELTE/Collapsible',
} satisfies Meta<CollapsibleDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		open: true,
		title: consentTypes.measurement.title,
		description: consentTypes.measurement.description,
	},
	play: toggleOpenClose,
};

export const ClosedByDefault: Story = {
	args: {
		open: false,
		title: consentTypes.functionality.title,
		description: consentTypes.functionality.description,
	},
	play: startsClosedByDefault,
};
