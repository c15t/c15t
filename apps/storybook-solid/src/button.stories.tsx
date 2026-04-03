import { buttonVariants } from '@c15t/solid';
import { buttonRenders } from '@c15t/storybook-tests/play/button';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

function Demo() {
	const classes = buttonVariants({
		variant: 'primary',
		mode: 'filled',
		size: 'medium',
	});

	return (
		<button class={classes.root()} type="button">
			Open preferences
		</button>
	);
}

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
			variant: 'primary',
			mode: 'filled',
			size: 'medium',
		});

		return (
			<button class={classes.root()} type="button">
				<span class={classes.icon()}>+</span>
				Open preferences
			</button>
		);
	},
};

export const NeutralGhost: Story = {
	render: () => {
		const classes = buttonVariants({
			variant: 'neutral',
			mode: 'ghost',
			size: 'medium',
		});

		return (
			<button class={classes.root()} type="button">
				Secondary action
			</button>
		);
	},
};

export const AllModes: Story = {
	render: () => {
		const primaryFilled = buttonVariants({
			variant: 'primary',
			mode: 'filled',
			size: 'medium',
		});
		const neutralFilled = buttonVariants({
			variant: 'neutral',
			mode: 'filled',
			size: 'medium',
		});
		const primaryStroke = buttonVariants({
			variant: 'primary',
			mode: 'stroke',
			size: 'medium',
		});
		const neutralStroke = buttonVariants({
			variant: 'neutral',
			mode: 'stroke',
			size: 'medium',
		});
		const primaryLighter = buttonVariants({
			variant: 'primary',
			mode: 'lighter',
			size: 'medium',
		});
		const neutralGhost = buttonVariants({
			variant: 'neutral',
			mode: 'ghost',
			size: 'medium',
		});

		return (
			<div
				style={{
					display: 'grid',
					gap: '0.75rem',
					'grid-template-columns': 'repeat(2, minmax(0, max-content))',
				}}
			>
				<button class={primaryFilled.root()} type="button">
					Primary filled
				</button>
				<button class={neutralFilled.root()} type="button">
					Neutral filled
				</button>
				<button class={primaryStroke.root()} type="button">
					Primary stroke
				</button>
				<button class={neutralStroke.root()} type="button">
					Neutral stroke
				</button>
				<button class={primaryLighter.root()} type="button">
					Primary lighter
				</button>
				<button class={neutralGhost.root()} type="button">
					Neutral ghost
				</button>
			</div>
		);
	},
};
