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
 * The dialog a visitor sees: the island mounted into the server-rendered
 * host. Named `Default` so it pairs with the other frameworks' `Default`,
 * which are also the open dialog.
 */
export const Default: Story = {
	render: () => renderAstroStory('consent-dialog--opened'),
};

/**
 * The resting state unique to Astro: `<ConsentDialog />` server-renders
 * only its host element and mounts nothing until something opens it. No
 * other framework has an equivalent, so this story pairs with nothing.
 */
export const ServerShell: Story = {
	render: () => renderAstroStory('consent-dialog--default'),
};
