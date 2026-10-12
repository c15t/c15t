import { devToolsFlow, devToolsReady } from '@c15t/conformance/play/devtools';
import type { Meta, StoryObj } from '@storybook/svelte-vite';

import DevToolsStory from './devtools-story.svelte';

const meta = {
	component: DevToolsStory,
	parameters: { layout: 'fullscreen' },
	tags: ['devtools'],
	title: 'COMPONENTS - SVELTE/Core/DevTools',
} satisfies Meta<DevToolsStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { play: devToolsReady };
export const ConsentAndScriptsFlow: Story = { play: devToolsFlow };
