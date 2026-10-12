import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Play functions for the design recipes the docs publish from each
 * Storybook (`Docs/Banner designs`). Every recipe story renders the recipe,
 * a "Privacy settings" control and the stock preferences dialog, so one set
 * of checks covers stock, compound and headless banners alike.
 */

const ACCEPT = /^accept all$/iu;
const REJECT = /^reject all$/iu;

const openPreferences = async function openPreferences() {
	const body = within(document.body);
	await userEvent.click(await body.findByText('Privacy settings'));
	return body.findByRole('switch', { name: /marketing/iu });
};

const decide = function decide(action: RegExp, granted: boolean): PlayFunction {
	return async () => {
		const body = within(document.body);
		const button = await body.findByRole('button', { name: action });
		await userEvent.click(button);
		// The banner closes once the choice is recorded.
		await waitFor(() => {
			expect(body.queryByRole('button', { name: action })).toBeNull();
		});
		// Reopening preferences shows the recorded choice.
		const marketing = await openPreferences();
		await waitFor(() => {
			expect(marketing).toHaveAttribute('aria-checked', String(granted));
		});
	};
};

/** The recipe shows Accept, Reject and a way to reach preferences. */
export const recipeRenders: PlayFunction = async () => {
	const body = within(document.body);
	const accept = await body.findByRole('button', { name: ACCEPT });
	// Stock banners fade in; wait for the transition to settle.
	await waitFor(() => {
		expect(accept).toBeVisible();
		expect(body.getByRole('button', { name: REJECT })).toBeVisible();
	});
	expect(body.getByText('Privacy settings')).toBeInTheDocument();
};

/** Accept closes the banner and records every category as granted. */
export const recipeAccepts: PlayFunction = decide(ACCEPT, true);

/** Reject closes the banner and records every optional category as denied. */
export const recipeRejects: PlayFunction = decide(REJECT, false);
