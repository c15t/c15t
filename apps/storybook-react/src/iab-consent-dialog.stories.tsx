import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { IABConsentDialog } from '../../../packages/react/src/index';
import { StorybookIABProvider } from './storybook-consent-fixtures';

const meta = {
	component: IABConsentDialog,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'Components/IAB/IAB Consent Dialog',
} satisfies Meta<typeof IABConsentDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	render: () => (
		<StorybookIABProvider>
			<IABConsentDialog open />
		</StorybookIABProvider>
	),
};

export const TabAndExpansionFlow: Story = {
	render: () => (
		<StorybookIABProvider>
			<IABConsentDialog open />
		</StorybookIABProvider>
	),
	play: async () => {
		const body = within(document.body);
		await userEvent.click(await body.findByRole('tab', { name: /vendors/i }));
		await userEvent.click(await body.findByRole('tab', { name: /purposes/i }));

		const expandButtons = body.getAllByRole('button');
		if (expandButtons.length > 0) {
			await userEvent.click(expandButtons[0]);
		}

		await expect(
			body.getByTestId('iab-consent-dialog-root')
		).toBeInTheDocument();
	},
};
