import type { Meta, StoryObj } from '@storybook/html-vite';

import { renderAstroStory } from './render-astro-story';

const meta = {
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - ASTRO/Core/Consent Dialog Trigger',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => renderAstroStory('consent-dialog-trigger--default'),
};
