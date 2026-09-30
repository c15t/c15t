import {
	recipeAccepts,
	recipeRejects,
	recipeRenders,
} from '@c15t/conformance/play/docs-recipes';
import type { Meta, StoryObj } from '@storybook/html-vite';

import { renderAstroStory } from './render-astro-story';

import '../../docs-recipe-page.css';

/**
 * The Astro version of the docs' bottom bar design: the server-rendered
 * banner with the `presentation` option from `docs-recipes/bottom-bar.ts`.
 * Like the React, Vue and Svelte recipes it renders over the demo page,
 * with a "Privacy settings" control and the stock dialog, so the shared
 * recipe checks and the parity gate compare the same scene.
 */
const meta = {
	parameters: { layout: 'fullscreen' },
	title: 'Docs/Banner designs',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const render = () => renderAstroStory('consent-banner--docs-bottom-bar');

/** Stock banner, `variant: 'bar'`. */
export const BottomBarDesign: Story = { play: recipeRenders, render };
export const BottomBarAccept: Story = { play: recipeAccepts, render };
export const BottomBarReject: Story = { play: recipeRejects, render };
