import { Switch } from '@c15t/react/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { enTranslations } from '../../../packages/translations/src';

const { consentTypes } = enTranslations;

const meta = {
	argTypes: {
		defaultChecked: {
			control: 'boolean',
		},
		disabled: {
			control: 'boolean',
		},
		size: {
			control: 'select',
			options: ['small', 'medium'],
		},
	},
	args: {
		defaultChecked: false,
		disabled: false,
		size: 'medium',
	},
	component: Switch.Root,
	parameters: {
		layout: 'centered',
	},
	render: (args) => (
		<div style={{ display: 'grid', gap: '0.75rem' }}>
			<label
				style={{
					alignItems: 'center',
					display: 'inline-flex',
					gap: '0.75rem',
				}}
			>
				<Switch.Root aria-label="Enable analytics" {...args} />
				<span>{consentTypes.measurement.title}</span>
			</label>
		</div>
	),
	title: 'Primitives/Switch',
} satisfies Meta<typeof Switch.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Checked: Story = {
	args: {
		defaultChecked: true,
	},
};

export const Controlled: Story = {
	render: (args) => {
		const Demo = () => {
			const [checked, setChecked] = useState(true);

			return (
				<div style={{ display: 'grid', gap: '0.75rem' }}>
					<label
						style={{
							alignItems: 'center',
							display: 'inline-flex',
							gap: '0.75rem',
						}}
					>
						<Switch.Root
							{...args}
							aria-label="Functional cookies"
							checked={checked}
							onCheckedChange={setChecked}
						/>
						<span>{consentTypes.functionality.title}</span>
					</label>
					<div aria-live="polite">
						State: {checked ? 'enabled' : 'disabled'}
					</div>
				</div>
			);
		};

		return <Demo />;
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: 'grid', gap: '1rem' }}>
			<label
				style={{
					alignItems: 'center',
					display: 'inline-flex',
					gap: '0.75rem',
				}}
			>
				<Switch.Root aria-label="Enable essential cookies" defaultChecked />
				<span>{consentTypes.necessary.title}</span>
			</label>
			<label
				style={{
					alignItems: 'center',
					display: 'inline-flex',
					gap: '0.75rem',
				}}
			>
				<Switch.Root
					aria-label="Enable personalization"
					defaultChecked
					size="small"
				/>
				<span>{consentTypes.functionality.title}</span>
			</label>
		</div>
	),
};
