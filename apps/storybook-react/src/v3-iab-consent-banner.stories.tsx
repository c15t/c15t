import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	IABConsentBanner,
	IABConsentDialog,
} from '../../../packages/react/src/v3/iab';
import { StorybookV3IABProvider } from './storybook-v3-fixtures';

const meta = {
	component: IABConsentBanner,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - REACT/V3/IAB Consent Banner',
} satisfies Meta<typeof IABConsentBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookV3IABProvider>
			<IABConsentBanner />
		</StorybookV3IABProvider>
	),
};

export const WithDialog: Story = {
	render: () => (
		<StorybookV3IABProvider>
			<IABConsentBanner />
			<IABConsentDialog />
		</StorybookV3IABProvider>
	),
};
