import type { Meta, StoryObj } from '@storybook/html-vite';

import { renderAstroStory } from './render-astro-story';

const meta = {
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - ASTRO/Core/Consent Dialog',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `<ConsentDialog />` server-renders only its host element; the surface is
 * an island mounted on first open. This story is that resting state.
 */
export const Default: Story = {
	render: () => renderAstroStory('consent-dialog--default'),
};

/** The same host with the island mounted, which is what a visitor sees. */
export const Opened: Story = {
	render: () => renderAstroStory('consent-dialog--opened'),
};
