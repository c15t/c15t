import { triggerOpensDialog } from '@c15t/storybook-tests/play/consent-dialog-trigger';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	ConsentDialog,
	ConsentDialogTrigger,
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
		<circle cx="12" cy="12" r="4" />
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
		<circle cx="12" cy="4" r="2" />
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
}) => (
	<StorybookConsentProvider
		options={editableConsentOptions}
		storedConsent={editableStoredConsent}
	>
		<ConsentDialog />
		<ConsentDialogTrigger
			showWhen="always"
			ariaLabel="Site controls"
			orientation={orientation}
			items={[
				{
					id: 'privacy',
					label: 'Open privacy settings',
					icon: 'branding',
					action: 'preferences',
				},
				{
					id: 'theme',
					label: 'Toggle color scheme',
					icon: {
						light: <MoonIcon />,
						dark: <SunIcon />,
					},
					action: 'custom',
					onSelect: () => document.documentElement.classList.toggle('dark'),
				},
				{
					id: 'accessibility',
					label: 'Open accessibility options',
					icon: <AccessibilityIcon />,
					action: 'custom',
					onSelect: () =>
						window.dispatchEvent(new CustomEvent('c15t:accessibility')),
				},
				{
					id: 'support',
					label: 'Open support chat',
					icon: <ChatIcon />,
					action: 'custom',
					onSelect: () => window.dispatchEvent(new CustomEvent('c15t:support')),
				},
			]}
		/>
	</StorybookConsentProvider>
);

const meta = {
	component: ConsentDialogTrigger,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'Components/Core/Consent Dialog Trigger',
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
				icon="fingerprint"
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
