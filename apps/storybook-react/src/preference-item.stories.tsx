import { PreferenceItem, Switch } from '@c15t/react/primitives';
import {
	switchIndependentOfTrigger,
	triggerExpandsContent,
} from '@c15t/storybook-tests/play/preference-item';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type React from 'react';
import { useState } from 'react';
import { enTranslations } from '../../../packages/translations/src';

const meta = {
	component: PreferenceItem.Root,
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Preference Item',
} satisfies Meta<typeof PreferenceItem.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

const { consentTypes } = enTranslations;

const cardStyle: React.CSSProperties = {
	border: '1px solid var(--c15t-border)',
	borderRadius: 'var(--c15t-radius-md)',
	padding: '1rem',
	width: '32rem',
};

const rowStyle: React.CSSProperties = {
	alignItems: 'center',
	display: 'flex',
	gap: '0.75rem',
	justifyContent: 'space-between',
};

const contentStyle = (open: boolean): React.CSSProperties => ({
	marginTop: open ? '0.75rem' : 0,
});

function LeadingIcon({ open }: { open: boolean }) {
	return <span aria-hidden="true">{open ? '-' : '+'}</span>;
}

function PreferenceItemCard({
	defaultChecked = false,
	defaultOpen = false,
	description,
	disabled = false,
	meta,
	title,
	withSwitch = false,
}: {
	defaultChecked?: boolean;
	defaultOpen?: boolean;
	description: string;
	disabled?: boolean;
	meta?: React.ReactNode;
	title: React.ReactNode;
	withSwitch?: boolean;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const [checked, setChecked] = useState(defaultChecked);

	return (
		<PreferenceItem.Root
			defaultOpen={defaultOpen}
			onOpenChange={setOpen}
			open={open}
		>
			<div style={cardStyle}>
				<div style={withSwitch ? rowStyle : undefined}>
					<PreferenceItem.Trigger style={withSwitch ? { flex: 1 } : undefined}>
						<PreferenceItem.Leading>
							<LeadingIcon open={open} />
						</PreferenceItem.Leading>
						<PreferenceItem.Header>
							<PreferenceItem.Title>{title}</PreferenceItem.Title>
							{meta ? <PreferenceItem.Meta>{meta}</PreferenceItem.Meta> : null}
						</PreferenceItem.Header>
					</PreferenceItem.Trigger>
					{withSwitch ? (
						<PreferenceItem.Control>
							<Switch.Root
								aria-label={typeof title === 'string' ? title : 'Toggle'}
								checked={checked}
								disabled={disabled}
								onCheckedChange={setChecked}
							/>
						</PreferenceItem.Control>
					) : null}
				</div>
				<PreferenceItem.Content>
					<div style={contentStyle(open)}>
						<p style={{ margin: 0 }}>{description}</p>
					</div>
				</PreferenceItem.Content>
			</div>
		</PreferenceItem.Root>
	);
}

export const TriggerOnly: Story = {
	play: triggerExpandsContent,
	render: () => (
		<PreferenceItemCard
			description={consentTypes.necessary.description}
			meta="Required"
			title={consentTypes.necessary.title}
		/>
	),
};

export const WithTrailingSwitch: Story = {
	play: switchIndependentOfTrigger,
	render: () => (
		<PreferenceItemCard
			defaultChecked={true}
			defaultOpen={true}
			description={consentTypes.measurement.description}
			meta="4 partners"
			title={consentTypes.measurement.title}
			withSwitch
		/>
	),
};

export const DisabledControl: Story = {
	render: () => (
		<PreferenceItemCard
			defaultOpen={true}
			description="Used to understand whether advertising campaigns lead to useful outcomes."
			disabled
			meta="6 partners"
			title="Advertising measurement"
			withSwitch
		/>
	),
};
