import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsentDialog } from '../../../packages/react/src/index';
import { StorybookConsentProvider } from './storybook-consent-fixtures';

const meta = {
	component: ConsentDialog,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - REACT/Core/Consent Dialog',
} satisfies Meta<typeof ConsentDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookConsentProvider
			storedConsent={{
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			}}
		>
			<ConsentDialog open />
		</StorybookConsentProvider>
	),
};
