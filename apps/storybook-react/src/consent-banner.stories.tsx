import { bannerToDialogFlow } from '@c15t/conformance/play/consent-banner';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
	title: 'COMPONENTS - REACT/Core/Consent Banner',
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
	play: bannerToDialogFlow,
	render: () => (
		<StorybookConsentProvider>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookConsentProvider>
	),
};
