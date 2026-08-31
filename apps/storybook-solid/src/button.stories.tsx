import { buttonRenders } from '@c15t/conformance/play/button';
import { buttonVariants } from '@c15t/solid';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

const Demo = () => {
	const classes = buttonVariants({
		mode: 'filled',
		size: 'medium',
		variant: 'primary',
	});

	return (
		<button
			class={classes.root()}
			type="button"
		>
			Open preferences
		</button>
	);
};

const meta = {
	component: Demo,
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Button',
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	play: buttonRenders,
};

export const WithIcon: Story = {
	render: () => {
		const classes = buttonVariants({
			mode: 'filled',
			size: 'medium',
			variant: 'primary',
		});

		return (
			<button
				class={classes.root()}
				type="button"
			>
				<span class={classes.icon()}>+</span>
				Open preferences
			</button>
		);
	},
};

export const NeutralGhost: Story = {
	render: () => {
		const classes = buttonVariants({
			mode: 'ghost',
			size: 'medium',
			variant: 'neutral',
		});

		return (
			<button
				class={classes.root()}
				type="button"
			>
				Secondary action
			</button>
		);
	},
};

export const AllModes: Story = {
	render: () => {
		const primaryFilled = buttonVariants({
			mode: 'filled',
			size: 'medium',
			variant: 'primary',
		});
		const neutralFilled = buttonVariants({
			mode: 'filled',
			size: 'medium',
			variant: 'neutral',
		});
		const primaryStroke = buttonVariants({
			mode: 'stroke',
			size: 'medium',
			variant: 'primary',
		});
		const neutralStroke = buttonVariants({
			mode: 'stroke',
			size: 'medium',
			variant: 'neutral',
		});
		const primaryLighter = buttonVariants({
			mode: 'lighter',
			size: 'medium',
			variant: 'primary',
		});
		const neutralGhost = buttonVariants({
			mode: 'ghost',
			size: 'medium',
			variant: 'neutral',
		});

		return (
			<div
				style={{
					display: 'grid',
					gap: '0.75rem',
					'grid-template-columns': 'repeat(2, minmax(0, max-content))',
				}}
			>
				<button
					class={primaryFilled.root()}
					type="button"
				>
					Primary filled
				</button>
				<button
					class={neutralFilled.root()}
					type="button"
				>
					Neutral filled
				</button>
				<button
					class={primaryStroke.root()}
					type="button"
				>
					Primary stroke
				</button>
				<button
					class={neutralStroke.root()}
					type="button"
				>
					Neutral stroke
				</button>
				<button
					class={primaryLighter.root()}
					type="button"
				>
					Primary lighter
				</button>
				<button
					class={neutralGhost.root()}
					type="button"
				>
					Neutral ghost
				</button>
			</div>
		);
	},
};
