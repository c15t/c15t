/**
 * IAB Storage E2E Tests
 *
 * Browser-based tests for TC String storage compliance.
 */

import { userEvent } from '@vitest/browser/context';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { IABConsentBanner } from '~/components/iab-consent-banner';
import { IABConsentDialog } from '~/components/iab-consent-dialog';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '~/providers/consent-manager-provider';
import {
	clearConsentState,
	defaultIABOptions,
	getStoredConsent,
	getStoredTCString,
	waitForCMP,
	waitForElement,
	waitForElementRemoved,
} from './e2e-setup';

describe('IAB Storage E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
		clearConsentManagerCache();
	});

	describe('localStorage Storage', () => {
		test('should store consent to localStorage', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-banner-accept-button"]'
			);
			await waitForCMP();

			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-banner-card"]');

			// Wait for localStorage to be updated
			await vi.waitFor(
				() => {
					const stored = window.localStorage.getItem('c15t');
					expect(stored).not.toBeNull();
					return stored;
				},
				{ timeout: 1000 }
			);

			const stored = window.localStorage.getItem('c15t');
			const parsed = JSON.parse(stored || '{}');
			expect(parsed.consents).toBeDefined();
		});

		test('should store TC string in localStorage', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-banner-accept-button"]'
			);
			await waitForCMP();

			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-banner-card"]');

			// Verify TC string storage
			const tcString = getStoredTCString();
			expect(tcString).toBeDefined();
			expect(typeof tcString).toBe('string');
		});

		test('TC string should be valid base64url format', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-banner-accept-button"]'
			);
			await waitForCMP();

			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-banner-card"]');

			const tcString = getStoredTCString();

			// TC strings are base64url encoded with dots as section separators
			// Format: core.disclosedVendors.allowedVendors.publisherTC
			const tcStringRegex = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;
			expect(tcString).toMatch(tcStringRegex);
		});
	});

	describe('Storage Update on Consent Change', () => {
		test('should update storage when Accept All clicked', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-banner-accept-button"]'
			);
			await waitForCMP();

			// Before action
			expect(getStoredConsent()).toBeNull();

			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-banner-card"]');

			// After action
			expect(getStoredConsent()).not.toBeNull();
		});

		test('should update storage when Reject All clicked', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const rejectButton = await waitForElement(
				'[data-testid="iab-banner-reject-button"]'
			);
			await waitForCMP();

			// Before action
			expect(getStoredConsent()).toBeNull();

			await userEvent.click(rejectButton);
			await waitForElementRemoved('[data-testid="iab-banner-card"]');

			// After action
			const consent = getStoredConsent();
			expect(consent).not.toBeNull();
			expect(consent?.consents?.necessary).toBe(true);
		});
	});

	describe('Storage Content', () => {
		test('should store consent info with timestamp', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-banner-accept-button"]'
			);
			await waitForCMP();

			const beforeTime = Date.now();
			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-banner-card"]');
			const afterTime = Date.now();

			const consent = getStoredConsent();
			expect(consent?.consentInfo?.time).toBeDefined();
			expect(consent?.consentInfo?.time).toBeGreaterThanOrEqual(
				beforeTime - 1000
			);
			expect(consent?.consentInfo?.time).toBeLessThanOrEqual(afterTime + 1000);
		});

		test('should store consent info with subjectId', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-banner-accept-button"]'
			);
			await waitForCMP();

			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-banner-card"]');

			const consent = getStoredConsent();
			expect(consent?.consentInfo?.subjectId).toBeDefined();
			expect(typeof consent?.consentInfo?.subjectId).toBe('string');
		});
	});

	describe('c15t Storage Key', () => {
		test('should use "c15t" key in localStorage', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-banner-accept-button"]'
			);
			await waitForCMP();

			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-banner-card"]');

			// Should use c15t key
			expect(window.localStorage.getItem('c15t')).not.toBeNull();
		});

		test('should use "c15t_tc_string" key for TC string', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-banner-accept-button"]'
			);
			await waitForCMP();

			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-banner-card"]');

			// Should use c15t_tc_string key
			expect(window.localStorage.getItem('c15t_tc_string')).not.toBeNull();
		});
	});
});
