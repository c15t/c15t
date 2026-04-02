import { Button } from '@c15t/react/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
	argTypes: {
		mode: {
			control: 'select',
			options: ['filled', 'stroke', 'lighter', 'ghost'],
		},
		size: {
			control: 'select',
			options: ['medium', 'small', 'xsmall', 'xxsmall'],
		},
		variant: {
			control: 'select',
			options: ['primary', 'neutral'],
		},
	},
	args: {
		children: 'Open preferences',
		mode: 'filled',
		size: 'medium',
		variant: 'primary',
	},
	component: Button.Root,
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Button',
} satisfies Meta<typeof Button.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithIcon: Story = {
	render: (args) => (
		<Button.Root {...args}>
			<Button.Icon as="span">+</Button.Icon>
			{args.children}
		</Button.Root>
	),
};

export const NeutralGhost: Story = {
	args: {
		children: 'Secondary action',
		mode: 'ghost',
		variant: 'neutral',
	},
};

export const AllModes: Story = {
	render: () => (
		<div
			style={{
				display: 'grid',
				gap: '0.75rem',
				gridTemplateColumns: 'repeat(2, minmax(0, max-content))',
			}}
		>
			<Button.Root mode="filled" variant="primary">
				Primary filled
			</Button.Root>
			<Button.Root mode="filled" variant="neutral">
				Neutral filled
			</Button.Root>
			<Button.Root mode="stroke" variant="primary">
				Primary stroke
			</Button.Root>
			<Button.Root mode="stroke" variant="neutral">
				Neutral stroke
			</Button.Root>
			<Button.Root mode="lighter" variant="primary">
				Primary lighter
			</Button.Root>
			<Button.Root mode="ghost" variant="neutral">
				Neutral ghost
			</Button.Root>
		</div>
	),
};
