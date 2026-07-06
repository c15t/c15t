import type { Meta, StoryObj } from '@storybook/react-vite';
import { IABConsentDialog } from '../../../packages/react/src/v3/iab';
import { StorybookV3IABProvider } from './storybook-v3-fixtures';

const meta = {
	component: IABConsentDialog,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - REACT/V3/IAB Consent Dialog',
} satisfies Meta<typeof IABConsentDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookV3IABProvider>
			<IABConsentDialog open />
		</StorybookV3IABProvider>
	),
};
