import type { Meta, StoryObj } from '@storybook/react-vite';

import { IABConsentDialog } from '../../../packages/react/src/iab';
import { StorybookIABProvider } from './storybook-consent-fixtures';

const meta = {
	component: IABConsentDialog,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - REACT/IAB/IAB Consent Dialog',
} satisfies Meta<typeof IABConsentDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

// Named to pair with the Svelte and Astro stories of the same surface.
export const Overview: Story = {
	render: () => (
		<StorybookIABProvider>
			<IABConsentDialog open />
		</StorybookIABProvider>
	),
};
