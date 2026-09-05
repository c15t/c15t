/**
 * IAB Banner E2E Tests
 *
 * Browser-based tests for IAB TCF 2.3 compliant banner.
 *
 * These tests run in Vitest browser mode and test the full IAB consent flow.
 * The mock GVL is passed directly via config.iab.gvl to bypass network fetching.
 */

import { userEvent } from '@vitest/browser/context';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { IABConsentBanner } from '~/components/iab-consent-banner';
import { IABConsentDialog } from '~/components/iab-consent-dialog';
import { ConsentProvider } from '~/provider';

import {
	clearConsentState,
	defaultProviderIABOptions,
	getStoredConsent,
	waitForElement,
	waitForElementRemoved,
} from './e2e-setup';

describe('IAB Banner E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
	});

	describe('Banner Display Requirements (IAB Appendix B)', () => {
		test('should show IAB banner with correct initial display', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');

			// Verify banner structure
			expect(
				document.querySelector('[data-testid="iab-consent-banner-card"]')
			).toBeInTheDocument();
			expect(
				document.querySelector('[data-testid="iab-consent-banner-header"]')
			).toBeInTheDocument();
			expect(
				document.querySelector('[data-testid="iab-consent-banner-footer"]')
			).toBeInTheDocument();
		});

		test('should display partner/vendor count from GVL', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');

			// The banner should show partner count
			const bannerText =
				document.querySelector('[data-testid="iab-consent-banner-header"]')
					?.textContent || '';

			// Should contain a number (partner count)
			expect(bannerText).toMatch(/\d+/u);
		});

		test('should display purpose summary with stack grouping', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');

			// Should have a purpose list
			const header = document.querySelector(
				'[data-testid="iab-consent-banner-header"]'
			);
			expect(header).toBeInTheDocument();
		});

		test('should display legitimate interest notice', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');

			// LI notice should be present
			const bannerText =
				document.querySelector('[data-testid="iab-consent-banner-header"]')
					?.textContent || '';

			// Should mention legitimate interest
			expect(bannerText.toLowerCase()).toContain('legitimate');
		});
	});

	describe('Banner CTA Requirements', () => {
		test('should have Accept, Reject, and Customize buttons', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');

			expect(
				document.querySelector(
					'[data-testid="iab-consent-banner-accept-button"]'
				)
			).toBeInTheDocument();
			expect(
				document.querySelector(
					'[data-testid="iab-consent-banner-reject-button"]'
				)
			).toBeInTheDocument();
			expect(
				document.querySelector(
					'[data-testid="iab-consent-banner-customize-button"]'
				)
			).toBeInTheDocument();
		});
	});

	describe('Banner Actions', () => {
		test('should accept all via banner and close', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-consent-banner-accept-button"]'
			);

			await userEvent.click(acceptButton);

			// Banner should close
			await waitForElementRemoved('[data-testid="iab-consent-banner-card"]');

			// Check localStorage for consent - wait for it to be saved
			await vi.waitFor(
				() => {
					const consent = getStoredConsent();
					expect(consent).toBeTruthy();
				},
				{ timeout: 1000 }
			);
		});

		test('should reject all via banner and close', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			const rejectButton = await waitForElement(
				'[data-testid="iab-consent-banner-reject-button"]'
			);

			await userEvent.click(rejectButton);

			// Banner should close
			await waitForElementRemoved('[data-testid="iab-consent-banner-card"]');

			// Check localStorage for consent
			const consent = await vi.waitFor(
				() => {
					const stored = getStoredConsent();
					expect(stored).not.toBeNull();
					return stored;
				},
				{ timeout: 2000 }
			);
			expect(consent?.consents?.necessary).toBe(true);
		});

		test('should open preference center from banner', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			const customizeButton = await waitForElement(
				'[data-testid="iab-consent-banner-customize-button"]'
			);

			await userEvent.click(customizeButton);

			// Preference center should open
			await waitForElement('[data-testid="iab-consent-dialog-root"]');
		});
	});

	describe('Banner Accessibility', () => {
		test('should have ARIA labels', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			const banner = await waitForElement(
				'[data-testid="iab-consent-banner-card"]'
			);

			// The card carries the dialog role explicitly: a native `dialog`
			// brings the user agent's 1em padding with it.
			expect(banner.getAttribute('role')).toBe('dialog');

			// Should have aria-label
			expect(banner.getAttribute('aria-label')).toBeTruthy();
		});

		test('should be keyboard accessible', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			const rejectButton = await waitForElement(
				'[data-testid="iab-consent-banner-reject-button"]'
			);
			const customizeButton = document.querySelector(
				'[data-testid="iab-consent-banner-customize-button"]'
			) as HTMLElement;
			const acceptButton = document.querySelector(
				'[data-testid="iab-consent-banner-accept-button"]'
			) as HTMLElement;

			// Buttons should be focusable
			rejectButton.focus();
			expect(document.activeElement).toBe(rejectButton);

			customizeButton.focus();
			expect(document.activeElement).toBe(customizeButton);

			acceptButton.focus();
			expect(document.activeElement).toBe(acceptButton);
		});
	});
});
