import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import {
	IABConsentBanner,
	IABConsentDialog,
} from '../../../packages/react/src/iab';
import { StorybookIABProvider } from './storybook-consent-fixtures';

const meta = {
	component: IABConsentBanner,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'Components/IAB/IAB Consent Banner',
} satisfies Meta<typeof IABConsentBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookIABProvider>
			<IABConsentBanner />
		</StorybookIABProvider>
	),
};

export const CustomizeFlow: Story = {
	render: () => (
		<StorybookIABProvider>
			<IABConsentBanner />
			<IABConsentDialog />
		</StorybookIABProvider>
	),
	play: async () => {
		const body = within(document.body);
		await userEvent.click(
			await body.findByTestId('iab-consent-banner-customize-button')
		);
		await expect(
			await body.findByTestId('iab-consent-dialog-root')
		).toBeInTheDocument();
	},
};
