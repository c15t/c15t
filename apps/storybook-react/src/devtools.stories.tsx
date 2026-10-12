import {
	devToolsProviderOptions,
	getDevToolsCategories,
} from '@c15t/conformance/fixtures/devtools';
import { devToolsFlow, devToolsReady } from '@c15t/conformance/play/devtools';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { DevTools } from '../../../packages/react/src/devtools';
import { ConsentProvider } from '../../../packages/react/src/index';

const meta = {
	component: DevTools,
	parameters: { layout: 'fullscreen' },
	tags: ['devtools'],
	title: 'COMPONENTS - REACT/Core/DevTools',
} satisfies Meta<typeof DevTools>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: devToolsReady,
	render: () => (
		<ConsentProvider options={devToolsProviderOptions}>
			<DevTools
				defaultOpen
				getConsentCategories={getDevToolsCategories}
			/>
		</ConsentProvider>
	),
};

export const ConsentAndScriptsFlow: Story = { ...Default, play: devToolsFlow };
