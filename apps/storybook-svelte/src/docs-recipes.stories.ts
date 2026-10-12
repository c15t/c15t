import {
	recipeAccepts,
	recipeRejects,
	recipeRenders,
} from '@c15t/conformance/play/docs-recipes';
import { ConsentBanner } from '@c15t/svelte';
import type { Meta, StoryObj } from '@storybook/svelte-vite';

import BottomBar from './docs-recipes/bottom-bar.svelte';
import HeadlessBar from './docs-recipes/cookie-bar.svelte';
import { slimBar } from './docs-recipes/slim-bar';
import DocsRecipeStory from './DocsRecipeStory.svelte';

/**
 * The designs on the docs' "Banner designs" page. Each story renders one
 * recipe from `docs-recipes/` over a plain page, with an in-memory policy
 * and no analytics.
 */
const meta = {
	component: DocsRecipeStory,
	parameters: { layout: 'fullscreen' },
	title: 'Docs/Banner designs',
} satisfies Meta<DocsRecipeStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const bottomBar = { recipe: BottomBar };
const slim = { options: slimBar, recipe: ConsentBanner };
const headlessBar = { recipe: HeadlessBar };

/** Stock banner, `variant="bar"`. */
export const BottomBarDesign: Story = { args: bottomBar, play: recipeRenders };
export const BottomBarAccept: Story = { args: bottomBar, play: recipeAccepts };
export const BottomBarReject: Story = { args: bottomBar, play: recipeRejects };

/** Stock banner on one row through `theme.slots` classes. */
export const SlimBarDesign: Story = { args: slim, play: recipeRenders };
export const SlimBarAccept: Story = { args: slim, play: recipeAccepts };
export const SlimBarReject: Story = { args: slim, play: recipeRejects };

/** Own markup on `getHeadlessConsent()`, stock dialog for preferences. */
export const HeadlessBarDesign: Story = {
	args: headlessBar,
	play: recipeRenders,
};
export const HeadlessBarAccept: Story = {
	args: headlessBar,
	play: recipeAccepts,
};
export const HeadlessBarReject: Story = {
	args: headlessBar,
	play: recipeRejects,
};
