import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Verifies collapsible toggle: click trigger toggles content open/closed.
 * Expects the story to render with `defaultOpen={true}`.
 */
export const toggleOpenClose: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const trigger = canvas.getByRole('button');
	const content = canvasElement.querySelector('[data-state]');

	// Should be open by default
	await expect(content).toHaveAttribute('data-state', 'open');

	// Click to close
	await userEvent.click(trigger);
	await expect(content).toHaveAttribute('data-state', 'closed');

	// Click to reopen
	await userEvent.click(trigger);
	await expect(content).toHaveAttribute('data-state', 'open');
};

/**
 * Verifies collapsible starts closed when `defaultOpen={false}`.
 */
export const startsClosedByDefault: PlayFunction = async ({
	canvasElement,
}) => {
	const content = canvasElement.querySelector('[data-state]');
	await expect(content).toHaveAttribute('data-state', 'closed');

	// Click to open
	const canvas = within(canvasElement);
	const trigger = canvas.getByRole('button');
	await userEvent.click(trigger);
	await expect(content).toHaveAttribute('data-state', 'open');
};
