import { linkOpensDialog } from '@c15t/storybook-tests/play/consent-dialog-link';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	ConsentDialog,
	ConsentDialogLink,
} from '../../../packages/react/src/index';
import {
	editableConsentOptions,
	editableStoredConsent,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

const meta = {
	component: ConsentDialogLink,
	parameters: {
		layout: 'centered',
	},
	title: 'Components/Core/Consent Dialog Link',
} satisfies Meta<typeof ConsentDialogLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={editableStoredConsent}
		>
			<div style={{ padding: '2rem' }}>
				<ConsentDialogLink noStyle={false}>
					Privacy preferences
				</ConsentDialogLink>
				<ConsentDialog />
			</div>
		</StorybookConsentProvider>
	),
	play: linkOpensDialog,
};
