import { Collapsible } from '@c15t/react/primitives';
import {
	startsClosedByDefault,
	toggleOpenClose,
} from '@c15t/storybook-tests/play/collapsible';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type React from 'react';
import { enTranslations } from '../../../packages/translations/src';

const meta = {
	component: Collapsible.Root,
	parameters: {
		layout: 'centered',
	},
	title: 'PRIMITIVES - REACT/Collapsible',
} satisfies Meta<typeof Collapsible.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

const { consentTypes } = enTranslations;

const rootStyle: React.CSSProperties = {
	'--collapsible-gap': '0.75rem',
	border: '1px solid var(--c15t-border)',
	borderRadius: 'var(--c15t-radius-md)',
	padding: '1rem',
	width: '32rem',
} as React.CSSProperties;

const triggerStyle: React.CSSProperties = {
	alignItems: 'center',
	display: 'flex',
	fontWeight: 600,
	justifyContent: 'space-between',
	width: '100%',
};

export const Default: Story = {
	play: toggleOpenClose,
	render: () => (
		<Collapsible.Root defaultOpen style={rootStyle}>
			<Collapsible.Trigger style={triggerStyle}>
				<span>{consentTypes.measurement.title}</span>
				<span aria-hidden="true">+</span>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<p style={{ margin: 0 }}>{consentTypes.measurement.description}</p>
			</Collapsible.Content>
		</Collapsible.Root>
	),
};

export const ClosedByDefault: Story = {
	play: startsClosedByDefault,
	render: () => (
		<Collapsible.Root defaultOpen={false} style={rootStyle}>
			<Collapsible.Trigger style={triggerStyle}>
				<span>{consentTypes.functionality.title}</span>
				<span aria-hidden="true">+</span>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<p style={{ margin: 0 }}>{consentTypes.functionality.description}</p>
			</Collapsible.Content>
		</Collapsible.Root>
	),
};
