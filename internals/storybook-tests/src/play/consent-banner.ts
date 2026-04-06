import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Clicks the customize button on the consent banner and verifies
 * the consent dialog opens.
 */
export const bannerToDialogFlow: PlayFunction = async () => {
	const body = within(document.body);
	await userEvent.click(
		await body.findByTestId('consent-banner-customize-button')
	);

	await expect(
		await body.findByTestId('consent-dialog-root')
	).toBeInTheDocument();
};
