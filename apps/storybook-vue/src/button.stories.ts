import { buttonRenders } from '@c15t/conformance/play/button';
import { buttonVariants } from '@c15t/ui/styles/primitives';
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
			return { label: enTranslations.common.customize, rootClass };
		},
		template: `
			<button :class="rootClass" type="button">{{ label }}</button>
		`,
	}),
};

export const WithIcon: Story = {
	render: () => ({
		setup() {
			const classes = buttonVariants({ mode: 'filled', variant: 'primary' });
			return { iconClass: classes.icon(), rootClass: classes.root() };
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
				mode: 'ghost',
				variant: 'neutral',
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
					label: 'Primary filled',
					mode: 'filled' as const,
					variant: 'primary' as const,
				},
				{
					label: 'Neutral filled',
					mode: 'filled' as const,
					variant: 'neutral' as const,
				},
				{
					label: 'Primary stroke',
					mode: 'stroke' as const,
					variant: 'primary' as const,
				},
				{
					label: 'Neutral stroke',
					mode: 'stroke' as const,
					variant: 'neutral' as const,
				},
				{
					label: 'Primary lighter',
					mode: 'lighter' as const,
					variant: 'primary' as const,
				},
				{
					label: 'Neutral ghost',
					mode: 'ghost' as const,
					variant: 'neutral' as const,
				},
			];
			const buttons = modes.map((m) => ({
				className: buttonVariants({ mode: m.mode, variant: m.variant }).root(),
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
