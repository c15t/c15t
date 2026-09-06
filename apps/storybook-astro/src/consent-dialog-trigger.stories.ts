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

/**
 * Astro's trigger is an inline `<button>` that carries `data-c15t-action`
 * and nothing else — a site styles it. React's is a draggable floating
 * widget with its own stylesheet. They share a `data-testid` but they are
 * not the same component, so this story deliberately does not use the
 * name the other frameworks pair on.
 */
export const InlineButton: Story = {
	render: () => renderAstroStory('consent-dialog-trigger--default'),
};
