import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Tabs to the consent link, presses Enter, and verifies the dialog opens.
 */
export const linkOpensDialog: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	await userEvent.tab();
	await expect(
		canvas.getByRole('button', { name: /privacy preferences/i })
	).toHaveFocus();
	await userEvent.keyboard('{Enter}');
	await expect(
		await within(document.body).findByTestId('consent-dialog-root')
	).toBeInTheDocument();
};
