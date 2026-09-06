import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsentWidget } from '../../../packages/react/src/index';
import { StorybookConsentProvider } from './storybook-consent-fixtures';

const meta = {
	component: ConsentWidget,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - REACT/Core/Consent Widget',
} satisfies Meta<typeof ConsentWidget>;

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
			<div style={{ width: '32rem' }}>
				<ConsentWidget />
			</div>
		</StorybookConsentProvider>
	),
};
