import { dialogFocusManagement } from '@c15t/conformance/play/consent-dialog';
import { triggerOpensDialog } from '@c15t/conformance/play/consent-dialog-trigger';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import {
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentDialogTriggerToolbar,
	type TriggerOrientation,
} from '../../../packages/react/src/index';
import {
	editableConsentOptions,
	editableStoredConsent,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

const MoonIcon = () => (
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
	>
		<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
	</svg>
);

const SunIcon = () => (
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
	>
		<circle
			cx="12"
			cy="12"
			r="4"
		/>
		<path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
	</svg>
);

const AccessibilityIcon = () => (
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
	>
		<circle
			cx="12"
			cy="4"
			r="2"
		/>
		<path d="M5 8h14M12 6v7M8 22l4-9 4 9M8 14l-3 5M16 14l3 5" />
	</svg>
);

const ChatIcon = () => (
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
	>
		<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
		<path d="M8 10h.01M12 10h.01M16 10h.01" />
	</svg>
);

const ToolbarPreview = ({
	orientation = 'horizontal',
}: {
	orientation?: TriggerOrientation;
}) => {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		const root = document.documentElement;
		const initialDarkState = root.classList.contains('dark');

		return () => root.classList.toggle('dark', initialDarkState);
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', isDark);
	}, [isDark]);

	return (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={editableStoredConsent}
		>
			<ConsentDialog />
			<ConsentDialogTriggerToolbar
				actions={[
					{
						id: 'theme',
						label: 'Dark color scheme',
						icon: isDark ? <SunIcon /> : <MoonIcon />,
						onSelect: () => setIsDark((current) => !current),
						pressed: isDark,
					},
					{
						id: 'accessibility',
						label: 'Open accessibility options',
						icon: <AccessibilityIcon />,
						onSelect: () =>
							window.dispatchEvent(new CustomEvent('c15t:accessibility')),
					},
					{
						id: 'support',
						label: 'Open support chat',
						icon: <ChatIcon />,
						onSelect: () =>
							window.dispatchEvent(new CustomEvent('c15t:support')),
					},
				]}
				ariaLabel="Site controls"
				orientation={orientation}
				showWhen="always"
			/>
		</StorybookConsentProvider>
	);
};

const CustomStyledToolbarPreview = () => {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		const root = document.documentElement;
		const initialDarkState = root.classList.contains('dark');

		return () => root.classList.toggle('dark', initialDarkState);
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', isDark);
	}, [isDark]);

	return (
		<StorybookConsentProvider
			options={{
				...editableConsentOptions,
				theme: {
					slots: {
						consentDialogTriggerToolbar: {
							style: {
								'--cdtt-bg': 'rgba(15, 23, 42, 0.92)',
								'--cdtt-bg-hover': 'rgba(51, 65, 85, 0.95)',
								'--cdtt-border': 'rgba(148, 163, 184, 0.3)',
								'--cdtt-focus-ring': '#bef264',
								'--cdtt-icon-color': '#f8fafc',
								'--cdtt-offset': '32px',
								'--cdtt-primary': '#a3e635',
								'--cdtt-primary-hover': '#bef264',
								'--cdtt-primary-text': '#1a2e05',
								backdropFilter: 'blur(16px)',
								borderRadius: '999px',
								gap: '4px',
								padding: '4px',
							},
						},
						consentDialogTriggerToolbarIcon: {
							style: {
								height: '18px',
								width: '18px',
							},
						},
						consentDialogTriggerToolbarItem: {
							style: {
								border: '0',
								borderRadius: '999px',
							},
						},
					},
				},
			}}
			storedConsent={editableStoredConsent}
		>
			<div
				style={{
					background:
						'linear-gradient(135deg, rgb(248 250 252), rgb(226 232 240))',
					boxSizing: 'border-box',
					color: '#0f172a',
					minHeight: '100vh',
					padding: '48px',
				}}
			>
				<h1 style={{ fontFamily: 'sans-serif', margin: 0 }}>
					Custom toolbar preview
				</h1>
				<p
					style={{
						fontFamily: 'sans-serif',
						lineHeight: 1.6,
						maxWidth: '520px',
					}}
				>
					This example uses theme slots for the shared pill treatment and direct
					action styles for the active theme and preferences controls.
				</p>
			</div>
			<ConsentDialog />
			<ConsentDialogTriggerToolbar
				actions={[
					{
						id: 'theme',
						label: 'Dark color scheme',
						icon: isDark ? <SunIcon /> : <MoonIcon />,
						onSelect: () => setIsDark((current) => !current),
						pressed: isDark,
						style: isDark
							? {
									background: '#a3e635',
									color: '#1a2e05',
								}
							: undefined,
					},
					{
						id: 'support',
						label: 'Open support chat',
						icon: <ChatIcon />,
						onSelect: () =>
							window.dispatchEvent(new CustomEvent('c15t:support')),
					},
				]}
				ariaLabel="Custom site controls"
				preferences={{
					icon: 'fingerprint',
					label: 'Manage privacy settings',
					style: {
						boxShadow: '0 0 0 1px rgb(255 255 255 / 0.18) inset',
					},
				}}
				showWhen="always"
			/>
		</StorybookConsentProvider>
	);
};

const meta = {
	component: ConsentDialogTrigger,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - REACT/Core/Consent Dialog Trigger',
} satisfies Meta<typeof ConsentDialogTrigger>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={editableStoredConsent}
		>
			<ConsentDialog />
			<ConsentDialogTrigger showWhen="always" />
		</StorybookConsentProvider>
	),
	play: triggerOpensDialog,
};

export const DialogFocusManagement: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={editableStoredConsent}
		>
			<ConsentDialog />
			<ConsentDialogTrigger showWhen="always" />
		</StorybookConsentProvider>
	),
	play: dialogFocusManagement,
};

export const Mobile: Story = {
	parameters: {
		viewport: {
			defaultViewport: 'mobile1',
		},
	},
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={editableStoredConsent}
		>
			<ConsentDialog />
			<ConsentDialogTrigger
				defaultPosition="bottom-left"
				showWhen="always"
				size="sm"
			/>
		</StorybookConsentProvider>
	),
};

export const Toolbar: Story = {
	render: () => <ToolbarPreview />,
};

export const VerticalToolbar: Story = {
	render: () => <ToolbarPreview orientation="vertical" />,
};

export const CustomStyledToolbar: Story = {
	render: () => <CustomStyledToolbarPreview />,
};
