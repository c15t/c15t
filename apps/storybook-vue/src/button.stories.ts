import { buttonRenders } from '@c15t/storybook-tests/play/button';
import { buttonVariants } from '@c15t/vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { enTranslations } from '../../../packages/translations/src';

const meta = {
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Button',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	play: buttonRenders,
	render: () => ({
		setup() {
			const rootClass = buttonVariants({ variant: 'primary' }).root();
			return { rootClass, label: enTranslations.common.customize };
		},
		template: `
			<button :class="rootClass" type="button">{{ label }}</button>
		`,
	}),
};

export const WithIcon: Story = {
	render: () => ({
		setup() {
			const classes = buttonVariants({ variant: 'primary', mode: 'filled' });
			return { rootClass: classes.root(), iconClass: classes.icon() };
		},
		template: `
			<button :class="rootClass" type="button">
				<span :class="iconClass">+</span>
				Open preferences
			</button>
		`,
	}),
};

export const NeutralGhost: Story = {
	render: () => ({
		setup() {
			const rootClass = buttonVariants({
				variant: 'neutral',
				mode: 'ghost',
			}).root();
			return { rootClass };
		},
		template: `
			<button :class="rootClass" type="button">Secondary action</button>
		`,
	}),
};

export const AllModes: Story = {
	render: () => ({
		setup() {
			const modes = [
				{
					variant: 'primary' as const,
					mode: 'filled' as const,
					label: 'Primary filled',
				},
				{
					variant: 'neutral' as const,
					mode: 'filled' as const,
					label: 'Neutral filled',
				},
				{
					variant: 'primary' as const,
					mode: 'stroke' as const,
					label: 'Primary stroke',
				},
				{
					variant: 'neutral' as const,
					mode: 'stroke' as const,
					label: 'Neutral stroke',
				},
				{
					variant: 'primary' as const,
					mode: 'lighter' as const,
					label: 'Primary lighter',
				},
				{
					variant: 'neutral' as const,
					mode: 'ghost' as const,
					label: 'Neutral ghost',
				},
			];
			const buttons = modes.map((m) => ({
				className: buttonVariants({ variant: m.variant, mode: m.mode }).root(),
				label: m.label,
			}));
			return { buttons };
		},
		template: `
			<div style="display:grid;gap:0.75rem;grid-template-columns:repeat(2,minmax(0,max-content))">
				<button
					v-for="btn in buttons"
					:key="btn.label"
					:class="btn.className"
					type="button"
				>{{ btn.label }}</button>
			</div>
		`,
	}),
};
