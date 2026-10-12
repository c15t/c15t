import {
	dialogContract,
	dialogEscapeCloses,
	saveFlow,
} from '@c15t/conformance/play/consent-dialog';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import {
	ConsentBanner,
	ConsentDialog,
} from '../../../packages/react/src/index';
import {
	editableConsentOptions,
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
	play: async () => {
		const overlay = await within(document.body).findByTestId(
			'consent-dialog-overlay'
		);
		await waitFor(() => expect(getComputedStyle(overlay).opacity).toBe('1'));
	},
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
			<ConsentDialog open />
		</StorybookConsentProvider>
	),
};

export const DialogContract: Story = {
	play: dialogContract,
	render: () => (
		<StorybookConsentProvider options={editableConsentOptions}>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
};
export const DialogEscapeCloses: Story = {
	...DialogContract,
	play: dialogEscapeCloses,
};
export const SaveFlow: Story = { ...DialogContract, play: saveFlow };
