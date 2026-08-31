import {
	multipleModeToggle,
	singleModeToggle,
} from '@c15t/conformance/play/accordion';
import { enTranslations } from '@c15t/translations';
import type { Meta, StoryObj } from '@storybook/svelte-vite';

import AccordionMultipleDemo from './AccordionMultipleDemo.svelte';
import AccordionSingleDemo from './AccordionSingleDemo.svelte';
import AccordionWithIntroDemo from './AccordionWithIntroDemo.svelte';

const { consentTypes, consentManagerDialog } = enTranslations;

const meta = {
	component: AccordionSingleDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'PRIMITIVES - SVELTE/Accordion',
} satisfies Meta<AccordionSingleDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = {
	args: {
		item1Description: consentTypes.necessary.description,
		item1Title: consentTypes.necessary.title,
		item2Description: consentTypes.measurement.description,
		item2Title: consentTypes.measurement.title,
	},
	play: singleModeToggle,
};

export const Multiple: Story = {
	args: {
		initialValue: ['purpose-1', 'purpose-2'],
		item1Description: consentTypes.marketing.description,
		item1Title: consentTypes.marketing.title,
		item2Description: consentTypes.functionality.description,
		item2Title: consentTypes.functionality.title,
		type: 'multiple',
	},
	play: multipleModeToggle,
};

export const WithIntroduction: Story = {
	args: {
		introDescription: consentManagerDialog.description,
		introTitle: consentManagerDialog.title,
		item1Description: consentTypes.necessary.description,
		item1Title: consentTypes.necessary.title,
		item2Description: consentTypes.measurement.description,
		item2Title: consentTypes.measurement.title,
	},
	// @ts-expect-error -- different component for this story
	component: AccordionWithIntroDemo,
};
