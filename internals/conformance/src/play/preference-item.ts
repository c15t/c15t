import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Verifies preference item expand/collapse via trigger button.
 */
export const triggerExpandsContent: PlayFunction = async ({
	canvasElement,
}) => {
	const canvas = within(canvasElement);
	const trigger = canvas.getByRole('button');
	const content = canvasElement.querySelector('[data-state]');

	// Toggle — click to change state
	const initialState = content?.getAttribute('data-state');
	await userEvent.click(trigger);

	const expectedState = initialState === 'open' ? 'closed' : 'open';
	await expect(content).toHaveAttribute('data-state', expectedState);

	// Toggle back
	await userEvent.click(trigger);
	await expect(content).toHaveAttribute('data-state', initialState);
};

/**
 * Verifies preference item with trailing switch: trigger and switch are
 * independently interactive.
 */
export const switchIndependentOfTrigger: PlayFunction = async ({
	canvasElement,
}) => {
	const canvas = within(canvasElement);
	const switchEl = canvas.getByRole('switch');
	const buttons = canvas.getAllByRole('button');
	// The trigger is the first button, switch is separate
	const trigger = buttons[0]!;

	// Toggle the switch — content state should not change
	const contentBefore = canvasElement
		.querySelector('[data-state]')
		?.getAttribute('data-state');
	await userEvent.click(switchEl);
	await expect(canvasElement.querySelector('[data-state]')).toHaveAttribute(
		'data-state',
		contentBefore
	);

	// Toggle the trigger — switch state should not change
	const switchStateBefore = switchEl.getAttribute('aria-checked');
	await userEvent.click(trigger);
	await expect(switchEl).toHaveAttribute('aria-checked', switchStateBefore);
};
