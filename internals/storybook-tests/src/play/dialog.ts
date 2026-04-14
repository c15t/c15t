import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Verifies dialog open/close flow: trigger opens dialog, close button closes it.
 */
export const openAndClose: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const body = within(document.body);

	// Click trigger to open
	const trigger = canvas.getByRole('button');
	await userEvent.click(trigger);

	// Dialog should be visible
	const dialog = await body.findByRole('dialog');
	await expect(dialog).toBeInTheDocument();

	// Close via the close button (first button inside the dialog footer)
	const closeButtons = within(dialog).getAllByRole('button');
	const closeButton = closeButtons[closeButtons.length - 1]!;
	await userEvent.click(closeButton);

	// Dialog should be removed
	await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
};

/**
 * Verifies ESC key closes the dialog.
 */
export const escCloses: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const body = within(document.body);

	// Open the dialog
	const trigger = canvas.getByRole('button');
	await userEvent.click(trigger);
	await expect(await body.findByRole('dialog')).toBeInTheDocument();

	// Press ESC
	await userEvent.keyboard('{Escape}');
	await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
};
