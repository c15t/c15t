import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

import {
	assertDomContract,
	assertStableElements,
} from '../assertions/dom-contract';
import { assertFocusReturnsTo, assertInitialFocus } from '../assertions/focus';
import { assertEscapeDismisses } from '../assertions/keyboard';

/**
 * DOM contract check for the opened consent dialog.
 */
export const dialogContract: PlayFunction = async () => {
	const body = within(document.body);
	await userEvent.click(
		await body.findByTestId('consent-banner-customize-button')
	);
	await body.findByTestId('consent-dialog-root');
	assertDomContract(document.body, 'consentDialog');
	assertStableElements(document.body, 'consentDialog');
	const root = body.getByTestId('consent-dialog-root');
	const card = body.getByTestId('consent-dialog-card');
	const description = body.getByTestId('consent-dialog-description');
	expect(root).toHaveAccessibleDescription(
		(description.textContent ?? '').replace(/\s+/gu, ' ').trim()
	);
	const title = body.getByTestId('consent-dialog-title');
	expect(getComputedStyle(title).marginBlockStart).toBe('0px');
	expect(getComputedStyle(title).marginBlockEnd).toBe('0px');
	await waitFor(() => {
		const focused = document.activeElement;
		expect(root.contains(focused)).toBe(true);
		if (
			focused instanceof HTMLElement &&
			getComputedStyle(focused).outlineStyle !== 'none'
		) {
			expect(focused.getBoundingClientRect().width).toBeLessThanOrEqual(
				card.getBoundingClientRect().width + 4
			);
		}
		if (root.dataset.slot === 'dialog-content' && focused === root) {
			expect(getComputedStyle(card).outlineStyle).not.toBe('none');
			expect(
				Number.parseFloat(getComputedStyle(card).outlineWidth)
			).toBeGreaterThan(0);
		}
	});
};

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

	await waitFor(() => {
		expect(body.queryByTestId('consent-dialog-root')).not.toBeInTheDocument();
	});
};

/**
 * Open dialog, press Escape, verify it closes.
 */
export const dialogEscapeCloses: PlayFunction = async () => {
	const body = within(document.body);
	await userEvent.click(
		await body.findByTestId('consent-banner-customize-button')
	);
	await body.findByTestId('consent-dialog-root');
	await assertEscapeDismisses(document.body, 'consent-dialog-root');
};

/**
 * Opens the dialog from the persistent floating trigger, verifies initial
 * focus lands on the dialog container, then verifies Escape returns focus to
 * the trigger.
 *
 * Uses the trigger (not the banner customize button) because the banner is
 * dismissed for good when the dialog closes, so it is the only opener that
 * exists again after close. The trigger itself unmounts while the dialog is
 * open and re-renders on close; `setupFocusTrap` re-targets it by testid.
 */
export const dialogFocusManagement: PlayFunction = async () => {
	const body = within(document.body);
	const trigger = await body.findByTestId('consent-dialog-trigger');
	(trigger as HTMLElement).focus();
	await userEvent.click(trigger);
	await body.findByTestId('consent-dialog-root');
	await assertInitialFocus(document.body, 'consent-dialog-root');
	await assertFocusReturnsTo(
		document.body,
		'consent-dialog-trigger',
		async () => {
			await userEvent.keyboard('{Escape}');
		}
	);
};
