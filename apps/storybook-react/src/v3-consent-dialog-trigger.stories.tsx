import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	ConsentDialog,
	ConsentDialogTrigger,
} from '../../../packages/react/src/v3/index';
import { StorybookV3ConsentProvider } from './storybook-v3-fixtures';

const meta = {
	component: ConsentDialogTrigger,
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - REACT/V3/Consent Dialog Trigger',
} satisfies Meta<typeof ConsentDialogTrigger>;

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
			<ConsentDialog />
			<ConsentDialogTrigger showWhen="always" />
		</StorybookV3ConsentProvider>
	),
};

export const Small: Story = {
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
			<ConsentDialog />
			<ConsentDialogTrigger
				defaultPosition="bottom-left"
				showWhen="always"
				size="sm"
			/>
		</StorybookV3ConsentProvider>
	),
};
