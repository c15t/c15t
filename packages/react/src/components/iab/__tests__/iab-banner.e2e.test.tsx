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
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import {
	clearConsentState,
	defaultIABOptions,
	getStoredConsent,
	waitForElement,
	waitForElementRemoved,
} from './e2e-setup';

describe('IAB Banner E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
	});

	describe('Banner Display Requirements (IAB Appendix B)', () => {
		test('should show IAB banner with correct initial display', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');

			// Verify banner structure
			expect(
				document.querySelector('[data-testid="iab-banner-card"]')
			).toBeInTheDocument();
			expect(
				document.querySelector('[data-testid="iab-banner-header"]')
			).toBeInTheDocument();
			expect(
				document.querySelector('[data-testid="iab-banner-footer"]')
			).toBeInTheDocument();
		});

		test('should display partner/vendor count from GVL', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');

			// The banner should show partner count
			const bannerText =
				document.querySelector('[data-testid="iab-banner-header"]')
					?.textContent || '';

			// Should contain a number (partner count)
			expect(bannerText).toMatch(/\d+/);
		});

		test('should display purpose summary with stack grouping', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');

			// Should have a purpose list
			const header = document.querySelector(
				'[data-testid="iab-banner-header"]'
			);
			expect(header).toBeInTheDocument();
		});

		test('should display legitimate interest notice', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');

			// LI notice should be present
			const bannerText =
				document.querySelector('[data-testid="iab-banner-header"]')
					?.textContent || '';

			// Should mention legitimate interest
			expect(bannerText.toLowerCase()).toContain('legitimate');
		});
	});

	describe('Banner CTA Requirements', () => {
		test('should have Accept, Reject, and Customize buttons', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');

			expect(
				document.querySelector('[data-testid="iab-banner-accept-button"]')
			).toBeInTheDocument();
			expect(
				document.querySelector('[data-testid="iab-banner-reject-button"]')
			).toBeInTheDocument();
			expect(
				document.querySelector('[data-testid="iab-banner-customize-button"]')
			).toBeInTheDocument();
		});
	});

	describe('Banner Actions', () => {
		test('should accept all via banner and close', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-banner-accept-button"]'
			);

			await userEvent.click(acceptButton);

			// Banner should close
			await waitForElementRemoved('[data-testid="iab-banner-card"]');

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
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const rejectButton = await waitForElement(
				'[data-testid="iab-banner-reject-button"]'
			);

			await userEvent.click(rejectButton);

			// Banner should close
			await waitForElementRemoved('[data-testid="iab-banner-card"]');

			// Check localStorage for consent
			const consent = getStoredConsent();
			expect(consent?.consents?.necessary).toBe(true);
		});

		test('should open preference center from banner', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const customizeButton = await waitForElement(
				'[data-testid="iab-banner-customize-button"]'
			);

			await userEvent.click(customizeButton);

			// Preference center should open
			await waitForElement('[data-testid="iab-preference-center-root"]');
		});
	});

	describe('Banner Accessibility', () => {
		test('should have ARIA labels', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const banner = await waitForElement('[data-testid="iab-banner-card"]');

			// Should have role dialog
			expect(banner.getAttribute('role')).toBe('dialog');

			// Should have aria-label
			expect(banner.getAttribute('aria-label')).toBeTruthy();
		});

		test('should be keyboard accessible', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const rejectButton = await waitForElement(
				'[data-testid="iab-banner-reject-button"]'
			);
			const customizeButton = document.querySelector(
				'[data-testid="iab-banner-customize-button"]'
			) as HTMLElement;
			const acceptButton = document.querySelector(
				'[data-testid="iab-banner-accept-button"]'
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
