import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
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
	play: async () => {
		const body = within(document.body);
		await userEvent.click(
			await body.findByRole('button', { name: /open privacy settings/i })
		);
		await expect(
			await body.findByTestId('consent-dialog-root')
		).toBeInTheDocument();
	},
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
