import type { Meta, StoryObj } from '@storybook/html-vite';

import { renderAstroStory } from './render-astro-story';

const meta = {
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - ASTRO/IAB/IAB Consent Banner',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Server-rendered, no framework JavaScript. The purposes summary and the
 * vendor count come from the same shared model the React, Svelte and Vue
 * banners read, so this pairs with theirs slot for slot.
 */
export const Default: Story = {
	render: () => renderAstroStory('iab-consent-banner--default'),
};
