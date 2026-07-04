import { controlledToggle, toggleOnOff } from '@c15t/conformance/play/switch';
import { getSwitchState, switchVariants, toggleSwitchValue } from '@c15t/vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';
import { enTranslations } from '../../../packages/translations/src';

const { consentTypes } = enTranslations;

const meta = {
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Switch',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const variants = switchVariants();
const smallVariants = switchVariants({ size: 'small' });

export const Playground: Story = {
	play: toggleOnOff,
	render: () => ({
		setup() {
			const checked = ref(false);
			const toggle = () => {
				checked.value = toggleSwitchValue(checked.value);
			};
			const switchState = computed(() => getSwitchState(checked.value));
			return {
				checked,
				toggle,
				switchState,
				rootClass: variants.root(),
				trackClass: variants.track(),
				thumbClass: variants.thumb(),
				label: consentTypes.measurement.title,
			};
		},
		template: `
			<div style="display:grid;gap:0.75rem">
				<label style="align-items:center;display:inline-flex;gap:0.75rem">
					<button
						:class="rootClass"
						role="switch"
						aria-label="Enable analytics"
						:aria-checked="String(checked)"
						:data-state="switchState"
						type="button"
						@click="toggle"
					>
						<span :class="trackClass"><span :class="thumbClass" /></span>
					</button>
					<span>{{ label }}</span>
				</label>
			</div>
		`,
	}),
};

export const Checked: Story = {
	render: () => ({
		setup() {
			const checked = ref(true);
			const toggle = () => {
				checked.value = toggleSwitchValue(checked.value);
			};
			const switchState = computed(() => getSwitchState(checked.value));
			return {
				checked,
				toggle,
				switchState,
				rootClass: variants.root(),
				trackClass: variants.track(),
				thumbClass: variants.thumb(),
				label: consentTypes.measurement.title,
			};
		},
		template: `
			<div style="display:grid;gap:0.75rem">
				<label style="align-items:center;display:inline-flex;gap:0.75rem">
					<button
						:class="rootClass"
						role="switch"
						aria-label="Enable analytics"
						:aria-checked="String(checked)"
						:data-state="switchState"
						type="button"
						@click="toggle"
					>
						<span :class="trackClass"><span :class="thumbClass" /></span>
					</button>
					<span>{{ label }}</span>
				</label>
			</div>
		`,
	}),
};

export const Controlled: Story = {
	play: controlledToggle,
	render: () => ({
		setup() {
			const checked = ref(true);
			const toggle = () => {
				checked.value = toggleSwitchValue(checked.value);
			};
			const switchState = computed(() => getSwitchState(checked.value));
			return {
				checked,
				toggle,
				switchState,
				rootClass: variants.root(),
				trackClass: variants.track(),
				thumbClass: variants.thumb(),
				label: consentTypes.functionality.title,
			};
		},
		template: `
			<div style="display:grid;gap:0.75rem">
				<label style="align-items:center;display:inline-flex;gap:0.75rem">
					<button
						:class="rootClass"
						role="switch"
						aria-label="Functional cookies"
						:aria-checked="String(checked)"
						:data-state="switchState"
						type="button"
						@click="toggle"
					>
						<span :class="trackClass"><span :class="thumbClass" /></span>
					</button>
					<span>{{ label }}</span>
				</label>
				<div aria-live="polite">State: {{ checked ? 'enabled' : 'disabled' }}</div>
			</div>
		`,
	}),
};

export const Disabled: Story = {
	render: () => ({
		setup() {
			return {
				rootClass: variants.root({ disabled: true }),
				trackClass: variants.track(),
				thumbClass: variants.thumb(),
				label: consentTypes.measurement.title,
			};
		},
		template: `
			<div style="display:grid;gap:0.75rem">
				<label style="align-items:center;display:inline-flex;gap:0.75rem">
					<button
						:class="rootClass"
						role="switch"
						aria-checked="false"
						data-state="unchecked"
						data-disabled=""
						disabled
						type="button"
					>
						<span :class="trackClass"><span :class="thumbClass" /></span>
					</button>
					<span>{{ label }}</span>
				</label>
			</div>
		`,
	}),
};

export const Sizes: Story = {
	render: () => ({
		setup() {
			const medium = switchVariants();
			const small = switchVariants({ size: 'small' });
			return {
				mediumRoot: medium.root(),
				mediumTrack: medium.track(),
				mediumThumb: medium.thumb(),
				smallRoot: small.root(),
				smallTrack: small.track(),
				smallThumb: small.thumb(),
				necessaryLabel: consentTypes.necessary.title,
				functionalityLabel: consentTypes.functionality.title,
			};
		},
		template: `
			<div style="display:grid;gap:1rem">
				<label style="align-items:center;display:inline-flex;gap:0.75rem">
					<button :class="mediumRoot" role="switch" aria-label="Enable essential cookies" aria-checked="true" data-state="checked" type="button">
						<span :class="mediumTrack"><span :class="mediumThumb" /></span>
					</button>
					<span>{{ necessaryLabel }}</span>
				</label>
				<label style="align-items:center;display:inline-flex;gap:0.75rem">
					<button :class="smallRoot" role="switch" aria-label="Enable personalization" aria-checked="true" data-state="checked" type="button">
						<span :class="smallTrack"><span :class="smallThumb" /></span>
					</button>
					<span>{{ functionalityLabel }}</span>
				</label>
			</div>
		`,
	}),
};
