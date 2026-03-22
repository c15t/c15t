import { Collapsible } from '@c15t/react/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { enTranslations } from '../../../packages/translations/src';

const meta = {
	component: Collapsible.Root,
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Collapsible',
} satisfies Meta<typeof Collapsible.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

const { consentTypes } = enTranslations;

const cardStyle: React.CSSProperties = {
	border: '1px solid var(--c15t-border)',
	borderRadius: 'var(--c15t-radius-md)',
	display: 'grid',
	gap: '0.75rem',
	padding: '1rem',
	width: '32rem',
};

const triggerStyle: React.CSSProperties = {
	alignItems: 'center',
	display: 'flex',
	fontWeight: 600,
	justifyContent: 'space-between',
	width: '100%',
};

export const Default: Story = {
	render: () => (
		<Collapsible.Root defaultOpen>
			<div style={cardStyle}>
				<Collapsible.Trigger style={triggerStyle}>
					<span>{consentTypes.measurement.title}</span>
					<span aria-hidden="true">+</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<p style={{ margin: 0 }}>{consentTypes.measurement.description}</p>
				</Collapsible.Content>
			</div>
		</Collapsible.Root>
	),
};

export const ClosedByDefault: Story = {
	render: () => (
		<Collapsible.Root defaultOpen={false}>
			<div style={cardStyle}>
				<Collapsible.Trigger style={triggerStyle}>
					<span>{consentTypes.functionality.title}</span>
					<span aria-hidden="true">+</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<p style={{ margin: 0 }}>{consentTypes.functionality.description}</p>
				</Collapsible.Content>
			</div>
		</Collapsible.Root>
	),
};
