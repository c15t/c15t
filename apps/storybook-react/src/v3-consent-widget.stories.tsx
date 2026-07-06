import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConsentWidget } from '../../../packages/react/src/v3/index';
import { StorybookV3ConsentProvider } from './storybook-v3-fixtures';

const meta = {
	component: ConsentWidget,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - REACT/V3/Consent Widget',
} satisfies Meta<typeof ConsentWidget>;

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
			<div style={{ width: '32rem' }}>
				<ConsentWidget />
			</div>
		</StorybookV3ConsentProvider>
	),
};
