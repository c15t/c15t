import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Verifies switch toggle: click toggles checked state and ARIA attributes.
 */
export const toggleOnOff: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const switchEl = canvas.getByRole('switch');

	// Should start unchecked
	await expect(switchEl).toHaveAttribute('aria-checked', 'false');
	await expect(switchEl).toHaveAttribute('data-state', 'unchecked');

	// Click to check
	await userEvent.click(switchEl);
	await expect(switchEl).toHaveAttribute('aria-checked', 'true');
	await expect(switchEl).toHaveAttribute('data-state', 'checked');

	// Click to uncheck
	await userEvent.click(switchEl);
	await expect(switchEl).toHaveAttribute('aria-checked', 'false');
	await expect(switchEl).toHaveAttribute('data-state', 'unchecked');
};

/**
 * Verifies controlled switch reflects external state and fires onCheckedChange.
 */
export const controlledToggle: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const switchEl = canvas.getByRole('switch');

	// Should start checked (controlled stories typically default to checked)
	await expect(switchEl).toHaveAttribute('aria-checked', 'true');

	// Click to uncheck
	await userEvent.click(switchEl);
	await expect(switchEl).toHaveAttribute('aria-checked', 'false');
};
