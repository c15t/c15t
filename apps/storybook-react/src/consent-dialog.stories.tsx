import { saveFlow } from '@c15t/storybook-tests/play/consent-dialog';
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
	title: 'Components/Core/Consent Dialog',
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

export const SaveFlow: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={editableStoredConsent}
		>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
	play: saveFlow,
};
