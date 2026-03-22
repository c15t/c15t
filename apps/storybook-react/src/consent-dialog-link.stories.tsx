import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';
import {
	ConsentDialog,
	ConsentDialogLink,
} from '../../../packages/react/src/index';
import { StorybookConsentProvider } from './storybook-consent-fixtures';

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
		<StorybookConsentProvider storedConsent={{ necessary: true }}>
			<div style={{ padding: '2rem' }}>
				<ConsentDialogLink noStyle={false}>
					Privacy preferences
				</ConsentDialogLink>
				<ConsentDialog />
			</div>
		</StorybookConsentProvider>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.tab();
		await expect(
			canvas.getByRole('button', { name: /privacy preferences/i })
		).toHaveFocus();
		await userEvent.keyboard('{Enter}');
		await expect(
			await within(document.body).findByTestId('consent-dialog-root')
		).toBeInTheDocument();
	},
};
