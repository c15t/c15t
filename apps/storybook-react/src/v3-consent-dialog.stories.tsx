import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConsentDialog } from '../../../packages/react/src/v3/index';
import { StorybookV3ConsentProvider } from './storybook-v3-fixtures';

const meta = {
	component: ConsentDialog,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - REACT/V3/Consent Dialog',
} satisfies Meta<typeof ConsentDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookV3ConsentProvider
			storedConsent={{
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			}}
		>
			<ConsentDialog open />
		</StorybookV3ConsentProvider>
	),
};
