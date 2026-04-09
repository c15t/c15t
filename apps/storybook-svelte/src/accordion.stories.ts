import {
	multipleModeToggle,
	singleModeToggle,
} from '@c15t/storybook-tests/play/accordion';
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
	title: 'Primitives/Accordion',
} satisfies Meta<AccordionSingleDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = {
	args: {
		item1Title: consentTypes.necessary.title,
		item1Description: consentTypes.necessary.description,
		item2Title: consentTypes.measurement.title,
		item2Description: consentTypes.measurement.description,
	},
	play: singleModeToggle,
};

export const Multiple: Story = {
	args: {
		item1Title: consentTypes.marketing.title,
		item1Description: consentTypes.marketing.description,
		item2Title: consentTypes.functionality.title,
		item2Description: consentTypes.functionality.description,
		type: 'multiple',
		initialValue: ['purpose-1', 'purpose-2'],
	},
	play: multipleModeToggle,
};

export const WithIntroduction: Story = {
	args: {
		introTitle: consentManagerDialog.title,
		introDescription: consentManagerDialog.description,
		item1Title: consentTypes.necessary.title,
		item1Description: consentTypes.necessary.description,
		item2Title: consentTypes.measurement.title,
		item2Description: consentTypes.measurement.description,
	},
	// @ts-expect-error -- different component for this story
	component: AccordionWithIntroDemo,
};
