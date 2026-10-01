import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConsentBanner } from 'c15t/react';
import type { ConsentProviderOptions } from 'c15t/react';
import { expect, waitFor, within } from 'storybook/test';

import { RecipePage } from './docs-recipe-page';
import { components as cssModules } from './docs-recipes/class-names/css-modules';
import { components as emotion } from './docs-recipes/class-names/emotion';
import { components as stylex } from './docs-recipes/class-names/stylex';
import {
	editableConsentOptions,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

import { components as vanillaExtract } from './docs-recipes/class-names/vanilla-extract.css';

interface CardStyle {
	borderTopColor: string;
	borderTopLeftRadius: string;
	borderTopWidth: string;
}

interface ClassNamesStoryProps {
	components?: ConsentProviderOptions['components'];
	/** Computed card styles the recipe's class must produce. */
	expected?: CardStyle;
}

/**
 * The docs' class-name examples: each passes a class from one styling tool
 * to the stock banner card through the `components` provider option.
 */
const ClassNamesStory = ({ components }: ClassNamesStoryProps) => (
	<StorybookConsentProvider options={{ ...editableConsentOptions, components }}>
		<RecipePage>
			<ConsentBanner />
		</RecipePage>
	</StorybookConsentProvider>
);

const readCardStyle = function readCardStyle(card: HTMLElement): CardStyle {
	const computed = getComputedStyle(card);
	return {
		borderTopColor: computed.borderTopColor,
		borderTopLeftRadius: computed.borderTopLeftRadius,
		borderTopWidth: computed.borderTopWidth,
	};
};

const findCard = async function findCard() {
	const body = within(document.body);
	const card = await body.findByTestId('consent-banner-card');
	// The stock banner fades in; wait for it to settle.
	await waitFor(() => {
		expect(card).toBeVisible();
	});
	return card;
};

const meta = {
	component: ClassNamesStory,
	parameters: { layout: 'fullscreen' },
	title: 'Docs/Class names',
} satisfies Meta<typeof ClassNamesStory>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every class the recipe passes lands on the card, and the computed border
 * matches the class's values. c15t's own card rule sets the same
 * properties (1px border, theme color and radius), so matching values mean
 * the class won the cascade, not just that it was attached.
 */
const classApplies: Story['play'] = async ({ args }) => {
	const card = await findCard();
	const className = args.components?.banner?.card?.className;
	expect(className).toBeTruthy();
	for (const token of className?.split(/\s+/u).filter(Boolean) ?? []) {
		expect(card).toHaveClass(token);
	}
	expect(readCardStyle(card)).toEqual(args.expected);
};

/** Control: without a class, c15t's own card styles apply. */
export const Stock: Story = {
	args: {},
	play: async () => {
		const style = readCardStyle(await findCard());
		expect(style.borderTopWidth).toBe('1px');
		expect(style.borderTopLeftRadius).not.toBe('4px');
	},
};

export const CSSModules: Story = {
	args: {
		components: cssModules,
		expected: {
			borderTopColor: 'rgb(219, 39, 119)',
			borderTopLeftRadius: '4px',
			borderTopWidth: '3px',
		},
	},
	name: 'CSS Modules',
	play: classApplies,
};

export const VanillaExtract: Story = {
	args: {
		components: vanillaExtract,
		expected: {
			borderTopColor: 'rgb(37, 99, 235)',
			borderTopLeftRadius: '4px',
			borderTopWidth: '3px',
		},
	},
	name: 'vanilla-extract',
	play: classApplies,
};

export const StyleX: Story = {
	args: {
		components: stylex,
		expected: {
			borderTopColor: 'rgb(22, 163, 74)',
			borderTopLeftRadius: '4px',
			borderTopWidth: '3px',
		},
	},
	name: 'StyleX',
	play: classApplies,
};

export const Emotion: Story = {
	args: {
		components: emotion,
		expected: {
			borderTopColor: 'rgb(234, 88, 12)',
			borderTopLeftRadius: '4px',
			borderTopWidth: '3px',
		},
	},
	name: 'Emotion',
	play: classApplies,
};
