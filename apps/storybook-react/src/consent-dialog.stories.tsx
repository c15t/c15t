import {
	dialogContract,
	dialogEscapeCloses,
	saveFlow,
} from '@c15t/conformance/play/consent-dialog';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	ConsentBanner,
	ConsentDialog,
} from '../../../packages/react/src/index';
import {
	editableConsentOptions,
	editableStoredConsent,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

const meta = {
	component: ConsentDialog,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - REACT/Core/Consent Dialog',
} satisfies Meta<typeof ConsentDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={editableStoredConsent}
		>
			<ConsentDialog open />
		</StorybookConsentProvider>
	),
};

export const DialogContract: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
	play: dialogContract,
};

export const SaveFlow: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
	play: saveFlow,
};

export const DialogEscapeCloses: Story = {
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
	play: dialogEscapeCloses,
};
