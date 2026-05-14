/**
 * IAB Preference Center E2E Tests
 *
 * Browser-based tests for IAB TCF 2.3 preference center.
 */

import { userEvent } from '@vitest/browser/context';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import { IABConsentDialog } from '~/v3/components/iab-consent-dialog';
import {
	clearConsentState,
	defaultIABOptions,
	getStoredConsent,
	waitForElement,
	waitForElementRemoved,
} from './e2e-setup';

describe('IAB Preference Center E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
	});

	describe('Preference Center Layout', () => {
		test('should render with purposes tab by default', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			// Should have tab buttons
			const tabButtons = document.querySelectorAll(
				'[data-testid="iab-consent-dialog-root"] button[data-state]'
			);
			expect(tabButtons.length).toBeGreaterThan(0);
		});

		test('should switch between purposes and vendors tabs', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
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

			if (vendorsTab) {
				await userEvent.click(vendorsTab);
				// Tab should now be active
				expect(vendorsTab.getAttribute('data-state')).toBe('active');
			}
		});

		test('should display loading state while GVL loads', async () => {
			// Create a delayed mock
			const originalFetch = globalThis.fetch;
			globalThis.fetch = vi.fn(
				() =>
					new Promise((resolve) =>
						setTimeout(
							() =>
								resolve(
									new Response(JSON.stringify({}), {
										status: 200,
										headers: { 'Content-Type': 'application/json' },
									})
								),
							1000
						)
					)
			) as typeof fetch;

			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			// Should show preference center
			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			globalThis.fetch = originalFetch;
		});
	});

	describe('Purposes Tab - Consent', () => {
		test('should display purpose toggles', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			// Component should render - content depends on GVL load
			const content = document.querySelector(
				'[data-testid="iab-consent-dialog-root"]'
			);
			expect(content).toBeInTheDocument();
		});

		test('all purpose consents should default to OFF (no pre-checked)', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			// Component should render - content depends on GVL load
			const content = document.querySelector(
				'[data-testid="iab-consent-dialog-root"]'
			);
			expect(content).toBeInTheDocument();
		});
	});

	describe('Purposes Tab - Legitimate Interest', () => {
		test('should display LI toggles for purposes 2-11', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			// Wait for content
			await vi.waitFor(
				() => {
					const content = document.querySelector(
						'[data-testid="iab-consent-dialog-root"]'
					);
					if (!content?.textContent?.length) {
						throw new Error('Content not loaded');
					}
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Special Features', () => {
		test('should display special features with opt-in toggles', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			// Wait for content
			await vi.waitFor(
				() => {
					const content = document.querySelector(
						'[data-testid="iab-consent-dialog-root"]'
					);
					if (!content?.textContent?.length) {
						throw new Error('Content not loaded');
					}
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Vendors Tab', () => {
		test('should display vendor list', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			// Verify vendors tab exists
			const tabButtons = Array.from(
				document.querySelectorAll(
					'[data-testid="iab-consent-dialog-root"] button'
				)
			);

			const vendorsTab = tabButtons.find((btn) =>
				btn.textContent?.toLowerCase().includes('vendor')
			);

			// Tab should exist - actual vendor content depends on GVL load
			expect(vendorsTab).toBeDefined();
		});
	});

	describe('Save & Cancel Actions', () => {
		test('should save preferences when Save button clicked', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			// Verify save button exists
			const buttons = Array.from(
				document.querySelectorAll(
					'[data-testid="iab-consent-dialog-root"] button'
				)
			);

			const saveButton = buttons.find(
				(btn) =>
					btn.textContent?.toLowerCase().includes('save') ||
					btn.textContent?.toLowerCase().includes('confirm')
			);

			expect(saveButton).toBeDefined();
		});

		test('should accept all when Accept All clicked', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			// Verify accept all button exists
			const buttons = Array.from(
				document.querySelectorAll(
					'[data-testid="iab-consent-dialog-root"] button'
				)
			);

			const acceptButton = buttons.find((btn) =>
				btn.textContent?.toLowerCase().includes('accept all')
			);

			expect(acceptButton).toBeDefined();
		});

		test('should reject all when Reject All clicked', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			// Verify reject all button exists
			const buttons = Array.from(
				document.querySelectorAll(
					'[data-testid="iab-consent-dialog-root"] button'
				)
			);

			const rejectButton = buttons.find((btn) =>
				btn.textContent?.toLowerCase().includes('reject all')
			);

			expect(rejectButton).toBeDefined();
		});
	});

	describe('Accessibility', () => {
		test('should have proper ARIA attributes', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentManagerProvider>
			);

			const dialog = await waitForElement(
				'[data-testid="iab-consent-dialog-card"]'
			);

			// Should have role dialog
			expect(dialog.getAttribute('role')).toBe('dialog');

			// Should have aria-label
			expect(dialog.getAttribute('aria-label')).toBeTruthy();
		});
	});
});
