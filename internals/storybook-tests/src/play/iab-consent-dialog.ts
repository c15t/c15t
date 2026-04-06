import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

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
