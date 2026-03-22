import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';
import {
	ConsentBanner,
	ConsentDialog,
} from '../../../packages/react/src/index';
import { StorybookConsentProvider } from './storybook-consent-fixtures';

const meta = {
	component: ConsentBanner,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'Components/Core/Consent Banner',
} satisfies Meta<typeof ConsentBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookConsentProvider>
			<ConsentBanner />
		</StorybookConsentProvider>
	),
};

export const BannerToDialogFlow: Story = {
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

		await expect(
			await body.findByTestId('consent-dialog-root')
		).toBeInTheDocument();
	},
};
