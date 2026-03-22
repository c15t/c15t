import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';
import {
	ConsentBanner,
	ConsentDialog,
} from '../../../packages/react/src/index';
import { StorybookConsentProvider } from './storybook-consent-fixtures';

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
		<StorybookConsentProvider>
			<ConsentDialog open />
		</StorybookConsentProvider>
	),
};

export const SaveFlow: Story = {
	render: () => (
		<StorybookConsentProvider>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
	play: async () => {
		const body = within(document.body);
		await userEvent.click(
			await body.findByTestId('consent-banner-customize-button')
		);
		await userEvent.click(
			await body.findByTestId('consent-widget-footer-save-button')
		);

		await expect(
			body.queryByTestId('consent-dialog-root')
		).not.toBeInTheDocument();
	},
};
