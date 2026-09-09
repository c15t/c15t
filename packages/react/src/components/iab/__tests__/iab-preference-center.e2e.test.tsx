/**
 * IAB Preference Center E2E Tests
 *
 * Browser-based tests for IAB TCF 2.3 preference center.
 */

import { userEvent } from '@vitest/browser/context';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { IABConsentDialog } from '~/components/iab-consent-dialog';

import {
	clearConsentState,
	defaultProviderIABOptions,
	waitForElement,
} from './e2e-setup';

describe('IAB Preference Center E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
	});

	test('should switch between purposes and vendors tabs', async () => {
		render(
			<ConsentProvider options={defaultProviderIABOptions}>
				<IABConsentDialog open />
			</ConsentProvider>
		);

		await waitForElement('[data-testid="iab-consent-dialog-root"]');

		// Find tab buttons by their text content
		const tabButtons = Array.from(
			document.querySelectorAll(
				'[data-testid="iab-consent-dialog-root"] button'
			)
		);

		const vendorsTab = tabButtons.find((btn) =>
			btn.textContent?.toLowerCase().includes('vendor')
		);

		expect(vendorsTab).toBeDefined();
		if (!vendorsTab) {
			throw new Error('Vendors tab is missing');
		}
		await userEvent.click(vendorsTab);
		expect(vendorsTab.getAttribute('data-state')).toBe('active');
	});

	describe('Accessibility', () => {
		test('should have proper ARIA attributes', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			const dialog = await waitForElement(
				'[data-testid="iab-consent-dialog-card"]'
			);

			// The card carries the dialog role explicitly: a native `dialog`
			// brings the user agent's 1em padding with it.
			expect(dialog.getAttribute('role')).toBe('dialog');

			// Should have aria-label
			expect(dialog.getAttribute('aria-label')).toBeTruthy();
		});
	});
});
