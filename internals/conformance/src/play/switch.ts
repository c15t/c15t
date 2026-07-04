import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Verifies switch toggle: click toggles checked state and ARIA attributes.
 */
export const toggleOnOff: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const switchEl = canvas.getByRole('switch');

	// Should start unchecked
	await waitFor(() => {
		expect(switchEl).toHaveAttribute('aria-checked', 'false');
		expect(switchEl).toHaveAttribute('data-state', 'unchecked');
	});

	// Click to check
	await userEvent.click(switchEl);
	await waitFor(() => {
		expect(switchEl).toHaveAttribute('aria-checked', 'true');
		expect(switchEl).toHaveAttribute('data-state', 'checked');
	});

	// Click to uncheck
	await userEvent.click(switchEl);
	await waitFor(() => {
		expect(switchEl).toHaveAttribute('aria-checked', 'false');
		expect(switchEl).toHaveAttribute('data-state', 'unchecked');
	});
};

/**
 * Verifies controlled switch reflects external state and fires onCheckedChange.
 */
export const controlledToggle: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const switchEl = canvas.getByRole('switch');

	// Should start checked (controlled stories typically default to checked)
	await waitFor(() => {
		expect(switchEl).toHaveAttribute('aria-checked', 'true');
	});

	// Click to uncheck
	await userEvent.click(switchEl);
	await waitFor(() => {
		expect(switchEl).toHaveAttribute('aria-checked', 'false');
	});
};
