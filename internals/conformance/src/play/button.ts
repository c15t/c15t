import { expect, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Verifies button renders with correct element type and attributes.
 */
export const buttonRenders: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const button = canvas.getByRole('button');

	await expect(button).toBeInTheDocument();
	await expect(button.tagName).toBe('BUTTON');
	await expect(button).toHaveAttribute('type', 'button');
};
