import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';
import {
	assertDomContract,
	assertStableElements,
} from '../assertions/dom-contract';

/**
 * Full DOM contract check for the consent banner: every declared element is
 * present with the expected role and attributes. Run this on the `Default`
 * story of every framework's banner to catch structural drift.
 */
export const bannerContract: PlayFunction = async () => {
	const body = within(document.body);
	await body.findByTestId('consent-banner-root');
	assertDomContract(document.body, 'consentBanner');
	assertStableElements(document.body, 'consentBanner');
};

/**
 * Clicks the customize button on the consent banner and verifies
 * the consent dialog opens.
 */
export const bannerToDialogFlow: PlayFunction = async () => {
	const body = within(document.body);
	await userEvent.click(
		await body.findByTestId('consent-banner-customize-button')
	);

	await expect(
		await body.findByTestId('consent-dialog-root')
	).toBeInTheDocument();
};

/**
 * Verifies keyboard activation of the accept button dismisses the banner.
 */
export const bannerAcceptViaKeyboard: PlayFunction = async () => {
	const body = within(document.body);
	const accept = await body.findByTestId('consent-banner-accept-button');
	(accept as HTMLElement).focus();
	expect(document.activeElement).toBe(accept);
	await userEvent.keyboard('{Enter}');
	await waitFor(() => {
		expect(body.queryByTestId('consent-banner-root')).not.toBeInTheDocument();
	});
};
