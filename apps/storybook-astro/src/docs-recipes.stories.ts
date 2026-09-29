import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

import { renderAstroStory } from './render-astro-story';

/**
 * The Astro version of the docs' bottom bar design: the server-rendered
 * banner with the `presentation` option from `docs-recipes/bottom-bar.ts`.
 */
const meta = {
	parameters: { layout: 'fullscreen' },
	title: 'Docs/Banner designs',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const render = () => renderAstroStory('consent-banner--docs-bottom-bar');

const storedMarketing = () => {
	const raw = window.localStorage.getItem('c15t');
	if (!raw) {
		return undefined;
	}
	const record = JSON.parse(raw) as {
		categories?: Record<string, { value?: boolean }>;
	};
	return record.categories?.marketing?.value;
};

const decide = function decide(action: RegExp, granted: boolean): PlayFunction {
	return async () => {
		const body = within(document.body);
		await userEvent.click(await body.findByRole('button', { name: action }));
		await waitFor(() => {
			expect(body.queryByRole('button', { name: action })).toBeNull();
		});
		await waitFor(() => {
			expect(storedMarketing()).toBe(granted);
		});
	};
};

/** The banner renders as a bar with Accept and Reject, and records nothing yet. */
export const BottomBarDesign: Story = {
	play: async () => {
		const body = within(document.body);
		const root = await body.findByTestId('consent-banner-root');
		expect(root).toHaveAttribute('data-variant', 'bar');
		await waitFor(() => {
			expect(
				body.getByRole('button', { name: /^accept all$/iu })
			).toBeVisible();
			expect(
				body.getByRole('button', { name: /^reject all$/iu })
			).toBeVisible();
		});
		expect(storedMarketing()).toBeUndefined();
	},
	render,
};

export const BottomBarAccept: Story = {
	play: decide(/^accept all$/iu, true),
	render,
};

export const BottomBarReject: Story = {
	play: decide(/^reject all$/iu, false),
	render,
};
