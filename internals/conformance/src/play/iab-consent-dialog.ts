import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';
import {
	assertDomContract,
	assertStableElements,
} from '../assertions/dom-contract';

/**
 * DOM contract check for the IAB consent dialog.
 */
export const iabDialogContract: PlayFunction = async () => {
	const body = within(document.body);
	await body.findByTestId('iab-consent-dialog-root');
	assertDomContract(document.body, 'iabConsentDialog');
	assertStableElements(document.body, 'iabConsentDialog');
};

/**
 * Switches to the vendors tab, expands a vendor row, switches back to
 * purposes, and verifies the dialog is still present.
 */
export const tabAndExpansionFlow: PlayFunction = async () => {
	const body = within(document.body);
	await userEvent.click(await body.findByRole('tab', { name: /vendors/i }));
	const vendorTrigger = body
		.getAllByRole('button')
		.find((button) => button.className.includes('vendorListTrigger'));
	await expect(vendorTrigger).toBeDefined();
	if (vendorTrigger) {
		await userEvent.click(vendorTrigger);
	}
	await userEvent.click(await body.findByRole('tab', { name: /purposes/i }));

	await expect(body.getByTestId('iab-consent-dialog-root')).toBeInTheDocument();
};
