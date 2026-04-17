import { triggerOpensDialog } from '@c15t/conformance/play/consent-dialog-trigger';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	ConsentDialog,
	ConsentDialogTrigger,
} from '../../../packages/react/src/index';
import {
	editableConsentOptions,
	editableStoredConsent,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

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
