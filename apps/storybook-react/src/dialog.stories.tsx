import { Button, Dialog, Switch } from '@c15t/react/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { enTranslations } from '../../../packages/translations/src';

const meta = {
	component: Dialog.Root,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'Primitives/Dialog',
} satisfies Meta<typeof Dialog.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

const { common, consentManagerDialog, consentTypes } = enTranslations;

const overlayStyle: React.CSSProperties = {
	background: 'var(--c15t-overlay)',
	border: 0,
	cursor: 'default',
	inset: 0,
	position: 'fixed',
};

const contentStyle: React.CSSProperties = {
	background: 'var(--c15t-surface)',
	border: '1px solid var(--c15t-border)',
	borderRadius: 'var(--c15t-radius-lg)',
	boxShadow: 'var(--c15t-shadow-lg)',
	color: 'var(--c15t-text)',
	display: 'grid',
	gap: '1rem',
	left: '50%',
	maxWidth: '32rem',
	padding: '1.5rem',
	position: 'fixed',
	top: '50%',
	transform: 'translate(-50%, -50%)',
	width: 'calc(100vw - 2rem)',
	zIndex: 1,
};

const triggerWrapStyle: React.CSSProperties = {
	alignItems: 'center',
	display: 'grid',
	inset: 0,
	placeItems: 'center',
	position: 'fixed',
};

const footerStyle: React.CSSProperties = {
	display: 'flex',
	gap: '0.75rem',
	justifyContent: 'flex-end',
};

export const Default: Story = {
	render: () => (
		<Dialog.Root>
			<div style={triggerWrapStyle}>
				<Dialog.Trigger asChild>
					<Button.Root variant="primary">{common.customize}</Button.Root>
				</Dialog.Trigger>
			</div>
			<Dialog.Portal>
				<Dialog.Overlay style={overlayStyle} />
				<Dialog.Content style={contentStyle}>
					<Dialog.Title style={{ fontSize: '1.5rem', margin: 0 }}>
						{consentManagerDialog.title}
					</Dialog.Title>
					<Dialog.Description
						style={{ color: 'var(--c15t-text-muted)', margin: 0 }}
					>
						{consentManagerDialog.description}
					</Dialog.Description>
					<div
						style={{
							alignItems: 'center',
							display: 'flex',
							justifyContent: 'space-between',
						}}
					>
						<div>
							<div style={{ fontWeight: 600 }}>
								{consentTypes.measurement.title}
							</div>
							<div
								style={{
									color: 'var(--c15t-text-muted)',
									fontSize: '0.925rem',
								}}
							>
								{consentTypes.measurement.description}
							</div>
						</div>
						<Switch.Root aria-label="Enable analytics cookies" defaultChecked />
					</div>
					<div style={footerStyle}>
						<Dialog.Close asChild>
							<Button.Root variant="neutral" mode="ghost">
								{common.rejectAll}
							</Button.Root>
						</Dialog.Close>
						<Dialog.Close asChild>
							<Button.Root variant="primary">{common.save}</Button.Root>
						</Dialog.Close>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	),
};

export const Controlled: Story = {
	render: () => {
		const Demo = () => {
			const [open, setOpen] = useState(true);

			return (
				<Dialog.Root open={open} onOpenChange={setOpen}>
					<div style={triggerWrapStyle}>
						<Button.Root onClick={() => setOpen(true)}>
							Re-open dialog
						</Button.Root>
					</div>
					<Dialog.Portal>
						<Dialog.Overlay style={overlayStyle} />
						<Dialog.Content style={contentStyle}>
							<Dialog.Title style={{ fontSize: '1.5rem', margin: 0 }}>
								Controlled dialog
							</Dialog.Title>
							<Dialog.Description
								style={{ color: 'var(--c15t-text-muted)', margin: 0 }}
							>
								This story proves the primitive works in controlled mode.
							</Dialog.Description>
							<div style={footerStyle}>
								<Button.Root
									variant="neutral"
									mode="ghost"
									onClick={() => setOpen(false)}
								>
									Close
								</Button.Root>
							</div>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			);
		};

		return <Demo />;
	},
};
