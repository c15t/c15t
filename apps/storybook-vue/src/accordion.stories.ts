import {
	accordionVariants,
	getAccordionItemState,
	isAccordionItemOpen,
	toggleAccordionValue,
} from '@c15t/framework-vue';
import {
	multipleModeToggle,
	singleModeToggle,
} from '@c15t/storybook-tests/play/accordion';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { enTranslations } from '../../../packages/translations/src';

const { consentManagerDialog, consentTypes } = enTranslations;

const meta = {
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Accordion',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const variants = accordionVariants();

export const Single: Story = {
	play: singleModeToggle,
	render: () => ({
		setup() {
			const value = ref<string | undefined>('purpose-1');

			const toggleItem = (itemValue: string) => {
				value.value = toggleAccordionValue({
					type: 'single',
					value: value.value,
					itemValue,
					collapsible: true,
				}) as string | undefined;
			};

			const itemState = (itemValue: string) =>
				getAccordionItemState('single', value.value, itemValue);
			const itemOpen = (itemValue: string) =>
				isAccordionItemOpen('single', value.value, itemValue);

			return {
				value,
				toggleItem,
				itemState,
				itemOpen,
				rootClass: variants.root(),
				itemClass: variants.item(),
				triggerClass: variants.trigger(),
				contentClass: variants.content(),
				contentInnerClass: variants.contentInner(),
				necessaryTitle: consentTypes.necessary.title,
				necessaryDesc: consentTypes.necessary.description,
				measurementTitle: consentTypes.measurement.title,
				measurementDesc: consentTypes.measurement.description,
			};
		},
		template: `
			<div style="display:grid;gap:0.75rem;width:28rem">
				<div :class="rootClass">
					<div :class="itemClass" data-slot="accordion-item" :data-state="itemState('purpose-1')">
						<button :class="triggerClass" type="button" @click="toggleItem('purpose-1')">
							<span>{{ necessaryTitle }}</span>
							<span aria-hidden="true">{{ itemOpen('purpose-1') ? '-' : '+' }}</span>
						</button>
						<div :class="contentClass" data-slot="accordion-content" :data-state="itemState('purpose-1')">
							<div data-slot="accordion-content-viewport">
								<div :class="contentInnerClass">{{ necessaryDesc }}</div>
							</div>
						</div>
					</div>
					<div :class="itemClass" data-slot="accordion-item" :data-state="itemState('purpose-2')">
						<button :class="triggerClass" type="button" @click="toggleItem('purpose-2')">
							<span>{{ measurementTitle }}</span>
							<span aria-hidden="true">{{ itemOpen('purpose-2') ? '-' : '+' }}</span>
						</button>
						<div :class="contentClass" data-slot="accordion-content" :data-state="itemState('purpose-2')">
							<div data-slot="accordion-content-viewport">
								<div :class="contentInnerClass">{{ measurementDesc }}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`,
	}),
};

export const Multiple: Story = {
	play: multipleModeToggle,
	render: () => ({
		setup() {
			const value = ref<string[]>(['purpose-1', 'purpose-2']);

			const toggleItem = (itemValue: string) => {
				value.value = toggleAccordionValue({
					type: 'multiple',
					value: value.value,
					itemValue,
				}) as string[];
			};

			const itemState = (itemValue: string) =>
				getAccordionItemState('multiple', value.value, itemValue);
			const itemOpen = (itemValue: string) =>
				isAccordionItemOpen('multiple', value.value, itemValue);

			return {
				value,
				toggleItem,
				itemState,
				itemOpen,
				rootClass: variants.root(),
				itemClass: variants.item(),
				triggerClass: variants.trigger(),
				contentClass: variants.content(),
				contentInnerClass: variants.contentInner(),
				marketingTitle: consentTypes.marketing.title,
				marketingDesc: consentTypes.marketing.description,
				functionalityTitle: consentTypes.functionality.title,
				functionalityDesc: consentTypes.functionality.description,
			};
		},
		template: `
			<div style="display:grid;gap:0.75rem;width:28rem">
				<div :class="rootClass">
					<div :class="itemClass" data-slot="accordion-item" :data-state="itemState('purpose-1')">
						<button :class="triggerClass" type="button" @click="toggleItem('purpose-1')">
							<span>{{ marketingTitle }}</span>
							<span aria-hidden="true">{{ itemOpen('purpose-1') ? '-' : '+' }}</span>
						</button>
						<div :class="contentClass" data-slot="accordion-content" :data-state="itemState('purpose-1')">
							<div data-slot="accordion-content-viewport">
								<div :class="contentInnerClass">{{ marketingDesc }}</div>
							</div>
						</div>
					</div>
					<div :class="itemClass" data-slot="accordion-item" :data-state="itemState('purpose-2')">
						<button :class="triggerClass" type="button" @click="toggleItem('purpose-2')">
							<span>{{ functionalityTitle }}</span>
							<span aria-hidden="true">{{ itemOpen('purpose-2') ? '-' : '+' }}</span>
						</button>
						<div :class="contentClass" data-slot="accordion-content" :data-state="itemState('purpose-2')">
							<div data-slot="accordion-content-viewport">
								<div :class="contentInnerClass">{{ functionalityDesc }}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`,
	}),
};

export const WithIntroduction: Story = {
	render: () => ({
		setup() {
			const value = ref<string | undefined>('purpose-1');

			const toggleItem = (itemValue: string) => {
				value.value = toggleAccordionValue({
					type: 'single',
					value: value.value,
					itemValue,
					collapsible: true,
				}) as string | undefined;
			};

			const itemState = (itemValue: string) =>
				getAccordionItemState('single', value.value, itemValue);
			const itemOpen = (itemValue: string) =>
				isAccordionItemOpen('single', value.value, itemValue);

			return {
				value,
				toggleItem,
				itemState,
				itemOpen,
				rootClass: variants.root(),
				itemClass: variants.item(),
				triggerClass: variants.trigger(),
				contentClass: variants.content(),
				contentInnerClass: variants.contentInner(),
				dialogTitle: consentManagerDialog.title,
				dialogDesc: consentManagerDialog.description,
				necessaryTitle: consentTypes.necessary.title,
				necessaryDesc: consentTypes.necessary.description,
				measurementTitle: consentTypes.measurement.title,
				measurementDesc: consentTypes.measurement.description,
			};
		},
		template: `
			<div style="display:grid;gap:1rem;width:32rem">
				<div style="display:grid;gap:0.5rem">
					<h3 style="font-size:1.25rem;margin:0">{{ dialogTitle }}</h3>
					<p style="color:var(--c15t-text-muted);margin:0">{{ dialogDesc }}</p>
				</div>
				<div :class="rootClass">
					<div :class="itemClass" data-slot="accordion-item" :data-state="itemState('purpose-1')">
						<button :class="triggerClass" type="button" @click="toggleItem('purpose-1')">
							<span>{{ necessaryTitle }}</span>
							<span aria-hidden="true">{{ itemOpen('purpose-1') ? '-' : '+' }}</span>
						</button>
						<div :class="contentClass" data-slot="accordion-content" :data-state="itemState('purpose-1')">
							<div data-slot="accordion-content-viewport">
								<div :class="contentInnerClass">{{ necessaryDesc }}</div>
							</div>
						</div>
					</div>
					<div :class="itemClass" data-slot="accordion-item" :data-state="itemState('purpose-2')">
						<button :class="triggerClass" type="button" @click="toggleItem('purpose-2')">
							<span>{{ measurementTitle }}</span>
							<span aria-hidden="true">{{ itemOpen('purpose-2') ? '-' : '+' }}</span>
						</button>
						<div :class="contentClass" data-slot="accordion-content" :data-state="itemState('purpose-2')">
							<div data-slot="accordion-content-viewport">
								<div :class="contentInnerClass">{{ measurementDesc }}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`,
	}),
};
