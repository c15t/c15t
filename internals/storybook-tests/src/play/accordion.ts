import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Verifies single-mode accordion: clicking a trigger opens it and closes the
 * previously open item.
 */
export const singleModeToggle: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const triggers = canvas.getAllByRole('button');

	// First trigger's content should be open by default (defaultValue)
	const firstContent = triggers[0]
		?.closest('[data-state]')
		?.querySelector('[data-state]');
	await expect(triggers[0]?.closest('[data-state]')).toHaveAttribute(
		'data-state',
		'open'
	);

	// Click second trigger — it opens, first closes
	await userEvent.click(triggers[1]!);
	await expect(triggers[0]?.closest('[data-state]')).toHaveAttribute(
		'data-state',
		'closed'
	);
	await expect(triggers[1]?.closest('[data-state]')).toHaveAttribute(
		'data-state',
		'open'
	);

	// Click second trigger again — it collapses (collapsible mode)
	await userEvent.click(triggers[1]!);
	await expect(triggers[1]?.closest('[data-state]')).toHaveAttribute(
		'data-state',
		'closed'
	);
};

/**
 * Verifies multiple-mode accordion: multiple items can be open simultaneously.
 */
export const multipleModeToggle: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const triggers = canvas.getAllByRole('button');

	// Both should be open by default (defaultValue includes both)
	await expect(triggers[0]?.closest('[data-state]')).toHaveAttribute(
		'data-state',
		'open'
	);
	await expect(triggers[1]?.closest('[data-state]')).toHaveAttribute(
		'data-state',
		'open'
	);

	// Close first — second stays open
	await userEvent.click(triggers[0]!);
	await expect(triggers[0]?.closest('[data-state]')).toHaveAttribute(
		'data-state',
		'closed'
	);
	await expect(triggers[1]?.closest('[data-state]')).toHaveAttribute(
		'data-state',
		'open'
	);
};
