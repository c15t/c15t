import {
	recipeAccepts,
	recipeRejects,
	recipeRenders,
} from '@c15t/conformance/play/docs-recipes';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConsentDialog } from 'c15t/react';
import type { ComponentType } from 'react';

import { RecipePage } from './docs-recipe-page';
import { CookieBanner as BottomBar } from './docs-recipes/bottom-bar';
import { ConsentUI as BrandCard } from './docs-recipes/brand-card';
import { CookieBanner as ChoiceWall } from './docs-recipes/choice-wall';
import { brandTheme } from './docs-recipes/consent-theme';
import { CookieBar as HeadlessBar } from './docs-recipes/headless-bar';
import { CookieBanner as SlimBar } from './docs-recipes/slim-bar';
import {
	editableConsentOptions,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

const themedOptions = { ...editableConsentOptions, theme: brandTheme };

/**
 * The designs on the docs' "Banner designs" page. Each story renders one
 * recipe from `docs-recipes/` over a plain page, with in-memory policy and
 * no analytics, and the docs screenshots are taken from these stories.
 */
const Recipe = ({
	recipe: RecipeComponent,
	themed = false,
	withDialog = true,
}: {
	recipe: ComponentType;
	themed?: boolean;
	withDialog?: boolean;
}) => (
	<StorybookConsentProvider
		options={themed ? themedOptions : editableConsentOptions}
	>
		<RecipePage>
			<RecipeComponent />
			{withDialog ? <ConsentDialog /> : null}
		</RecipePage>
	</StorybookConsentProvider>
);

const meta = {
	component: Recipe,
	parameters: { layout: 'fullscreen' },
	title: 'Docs/Banner designs',
} satisfies Meta<typeof Recipe>;

export default meta;
type Story = StoryObj<typeof meta>;

const bottomBar = { recipe: BottomBar };
const brandCard = { recipe: BrandCard, themed: true, withDialog: false };
const choiceWall = { recipe: ChoiceWall };
const slimBar = { recipe: SlimBar };
const headlessBar = { recipe: HeadlessBar };

/** Stock banner, `variant="bar"`. */
export const BottomBarDesign: Story = { args: bottomBar, play: recipeRenders };
export const BottomBarAccept: Story = { args: bottomBar, play: recipeAccepts };
export const BottomBarReject: Story = { args: bottomBar, play: recipeRejects };

/** Stock banner and dialog with theme tokens. */
export const BrandCardDesign: Story = { args: brandCard, play: recipeRenders };
export const BrandCardAccept: Story = { args: brandCard, play: recipeAccepts };
export const BrandCardReject: Story = { args: brandCard, play: recipeRejects };

/** Stock banner, `variant="wall"`. */
export const ChoiceWallDesign: Story = {
	args: choiceWall,
	play: recipeRenders,
};
export const ChoiceWallAccept: Story = {
	args: choiceWall,
	play: recipeAccepts,
};
export const ChoiceWallReject: Story = {
	args: choiceWall,
	play: recipeRejects,
};

/** Compound parts in a one-row bar. */
export const SlimBarDesign: Story = { args: slimBar, play: recipeRenders };
export const SlimBarAccept: Story = { args: slimBar, play: recipeAccepts };
export const SlimBarReject: Story = { args: slimBar, play: recipeRejects };

/** Own markup on `useHeadlessConsentUI`, stock dialog for preferences. */
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
