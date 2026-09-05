import { dialogFocusManagement } from '@c15t/conformance/play/consent-dialog';
import { triggerOpensDialog } from '@c15t/conformance/play/consent-dialog-trigger';
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	ConsentDialog,
	ConsentDialogTrigger,
} from '../../../packages/react/src/index';
import {
	editableConsentOptions,
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
	play: triggerOpensDialog,
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={{
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			}}
		>
			<ConsentDialog />
			<ConsentDialogTrigger showWhen="always" />
		</StorybookConsentProvider>
	),
};

export const Small: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={{
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			}}
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

export const DialogFocusManagement: Story = {
	...Default,
	play: dialogFocusManagement,
};
