import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Clicks the IAB banner customize button and verifies the IAB dialog opens.
 */
export const customizeFlow: PlayFunction = async () => {
	const body = within(document.body);
	await userEvent.click(
		await body.findByTestId('iab-consent-banner-customize-button')
	);
	await expect(
		await body.findByTestId('iab-consent-dialog-root')
	).toBeInTheDocument();
};
