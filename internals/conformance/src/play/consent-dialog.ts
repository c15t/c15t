import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';
import {
	assertDomContract,
	assertStableElements,
} from '../assertions/dom-contract';
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
