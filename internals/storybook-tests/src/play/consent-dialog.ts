import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Opens the dialog via banner customize, clicks save, verifies the dialog closes.
 */
export const saveFlow: PlayFunction = async () => {
	const body = within(document.body);
	await userEvent.click(
		await body.findByTestId('consent-banner-customize-button')
	);
	await userEvent.click(
		await body.findByTestId('consent-widget-footer-save-button')
	);

	await expect(
		body.queryByTestId('consent-dialog-root')
	).not.toBeInTheDocument();
};
