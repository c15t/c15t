import { bannerToDialogFlow } from '@c15t/conformance/play/consent-banner';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	ConsentBanner,
	ConsentDialog,
} from '../../../packages/react/src/v3/index';
import { StorybookV3ConsentProvider } from './storybook-v3-fixtures';

const meta = {
	component: ConsentBanner,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - REACT/V3/Consent Banner',
} satisfies Meta<typeof ConsentBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookV3ConsentProvider>
			<ConsentBanner />
		</StorybookV3ConsentProvider>
	),
};

export const BannerToDialogFlow: Story = {
	render: () => (
		<StorybookV3ConsentProvider>
			<ConsentBanner />
			<ConsentDialog />
		</StorybookV3ConsentProvider>
	),
	play: bannerToDialogFlow,
};
