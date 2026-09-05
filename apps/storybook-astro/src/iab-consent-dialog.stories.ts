import type { Meta, StoryObj } from '@storybook/html-vite';

import { renderAstroStory } from './render-astro-story';

const meta = {
	parameters: {
		layout: 'fullscreen',
	},
	title: 'COMPONENTS - ASTRO/IAB/IAB Consent Dialog',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * What Astro server-renders today: the host element the IAB island would
 * mount into. The island itself does not boot in this harness, so there is
 * no Astro IAB dialog to compare — the story is named for what it is
 * rather than pairing with the other frameworks' `Overview` and asserting
 * a parity that does not exist.
 */
export const ServerShell: Story = {
	render: () => renderAstroStory('iab-consent-dialog--overview'),
};
