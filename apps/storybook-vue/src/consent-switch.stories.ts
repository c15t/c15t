import { controlledToggle, toggleOnOff } from '@c15t/conformance/play/switch';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { enTranslations } from '../../../packages/translations/src';
import ConsentSwitch from '../../../packages/vue/src/runtime/components/consent-switch.vue';

const { consentTypes } = enTranslations;

const meta = {
	argTypes: {
		disabled: {
			control: 'boolean',
		},
		size: {
			control: 'select',
			options: ['small', 'medium'],
		},
	},
	args: {
		disabled: false,
		size: 'medium',
	},
	component: ConsentSwitch,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - VUE/Core/Consent Switch',
} satisfies Meta<typeof ConsentSwitch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	play: toggleOnOff,
	render: (args) => ({
		components: { ConsentSwitch },
		setup() {
			const checked = ref(false);
			return {
				args,
				checked,
				label: consentTypes.measurement.title,
			};
		},
		template: `
			<label style="align-items:center;display:inline-flex;gap:0.75rem">
				<ConsentSwitch v-model="checked" aria-label="Enable analytics" v-bind="args" />
				<span>{{ label }}</span>
			</label>
		`,
	}),
};

export const Controlled: Story = {
	play: controlledToggle,
	render: (args) => ({
		components: { ConsentSwitch },
		setup() {
			const checked = ref(true);
			return {
				args,
				checked,
				label: consentTypes.functionality.title,
			};
		},
		template: `
			<div style="display:grid;gap:0.75rem">
				<label style="align-items:center;display:inline-flex;gap:0.75rem">
					<ConsentSwitch v-model="checked" aria-label="Functional cookies" v-bind="args" />
					<span>{{ label }}</span>
				</label>
				<div aria-live="polite">State: {{ checked ? 'enabled' : 'disabled' }}</div>
			</div>
		`,
	}),
};

export const Sizes: Story = {
	render: () => ({
		components: { ConsentSwitch },
		setup() {
			const necessary = ref(true);
			const functionality = ref(true);
			return {
				functionality,
				functionalityLabel: consentTypes.functionality.title,
				necessary,
				necessaryLabel: consentTypes.necessary.title,
			};
		},
		template: `
			<div style="display:grid;gap:1rem">
				<label style="align-items:center;display:inline-flex;gap:0.75rem">
					<ConsentSwitch v-model="necessary" aria-label="Enable essential cookies" />
					<span>{{ necessaryLabel }}</span>
				</label>
				<label style="align-items:center;display:inline-flex;gap:0.75rem">
					<ConsentSwitch v-model="functionality" aria-label="Enable personalization" size="small" />
					<span>{{ functionalityLabel }}</span>
				</label>
			</div>
		`,
	}),
};
