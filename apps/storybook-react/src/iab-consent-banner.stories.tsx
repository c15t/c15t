import { customizeFlow } from '@c15t/conformance/play/iab-consent-banner';
import type { Meta, StoryObj } from '@storybook/react-vite';
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
	title: 'COMPONENTS - REACT/IAB/IAB Consent Banner',
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
	play: customizeFlow,
};
