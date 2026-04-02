import { collapsibleVariants, getOpenState } from '@c15t/framework-vue';
import {
	startsClosedByDefault,
	toggleOpenClose,
} from '@c15t/storybook-tests/play/collapsible';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';
import { enTranslations } from '../../../packages/translations/src';

const { consentTypes } = enTranslations;

const meta = {
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Collapsible',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const variants = collapsibleVariants();

export const Default: Story = {
	play: toggleOpenClose,
	render: () => ({
		setup() {
			const open = ref(true);
			const toggle = () => {
				open.value = !open.value;
			};
			const openState = computed(() => getOpenState(open.value));
			return {
				open,
				toggle,
				openState,
				rootClass: variants.root(),
				triggerClass: variants.trigger(),
				contentClass: variants.content(),
				title: consentTypes.measurement.title,
				description: consentTypes.measurement.description,
			};
		},
		template: `
			<div :class="rootClass" style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.75rem;padding:1rem;width:32rem">
				<button
					:class="triggerClass"
					type="button"
					style="align-items:center;display:flex;font-weight:600;justify-content:space-between;width:100%"
					@click="toggle"
				>
					<span>{{ title }}</span>
					<span aria-hidden="true">+</span>
				</button>
				<div :class="contentClass" :data-state="openState" v-show="open">
					<p style="margin:0">{{ description }}</p>
				</div>
			</div>
		`,
	}),
};

export const ClosedByDefault: Story = {
	play: startsClosedByDefault,
	render: () => ({
		setup() {
			const open = ref(false);
			const toggle = () => {
				open.value = !open.value;
			};
			const openState = computed(() => getOpenState(open.value));
			return {
				open,
				toggle,
				openState,
				rootClass: variants.root(),
				triggerClass: variants.trigger(),
				contentClass: variants.content(),
				title: consentTypes.functionality.title,
				description: consentTypes.functionality.description,
			};
		},
		template: `
			<div :class="rootClass" style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.75rem;padding:1rem;width:32rem">
				<button
					:class="triggerClass"
					type="button"
					style="align-items:center;display:flex;font-weight:600;justify-content:space-between;width:100%"
					@click="toggle"
				>
					<span>{{ title }}</span>
					<span aria-hidden="true">+</span>
				</button>
				<div :class="contentClass" :data-state="openState" v-show="open">
					<p style="margin:0">{{ description }}</p>
				</div>
			</div>
		`,
	}),
};
