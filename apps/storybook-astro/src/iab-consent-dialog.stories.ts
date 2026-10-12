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
 * The TCF preference centre, mounted the way a real page mounts it: the
 * server renders an empty host, the boot script opens the dialog, and the
 * island arrives on its own chunk.
 */
export const Overview: Story = {
	render: () => renderAstroStory('iab-consent-dialog--overview'),
};

/**
 * The same surface through the React adapter. A site picks one `ui`; these
 * three stories are how we know all three still mount.
 */
export const OverviewReact: Story = {
	render: () => renderAstroStory('iab-consent-dialog--overview-react'),
};

/** The same surface through the Vue adapter. */
export const OverviewVue: Story = {
	render: () => renderAstroStory('iab-consent-dialog--overview-vue'),
};
