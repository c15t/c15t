import { expandedCategories } from '@c15t/conformance/play/consent-widget';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import ConsentWidget from '../../../packages/vue/src/runtime/components/consent-widget.vue';
import { useStorybookConsent } from './storybook-consent-fixtures';

const meta = {
	component: ConsentWidget,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - VUE/Core/Consent Widget',
} satisfies Meta<typeof ConsentWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: { ConsentWidget },
		setup() {
			useStorybookConsent(null);
		},
		template: '<div style="width: 32rem;"><ConsentWidget /></div>',
	}),
};

export const ExpandedCategories: Story = {
	render: () => ({
		components: { ConsentWidget },
		setup() {
			useStorybookConsent(null);
		},
		template: '<div style="width: 32rem;"><ConsentWidget /></div>',
	}),
	play: expandedCategories,
};
