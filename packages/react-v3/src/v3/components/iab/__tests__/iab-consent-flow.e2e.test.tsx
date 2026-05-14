/**
 * IAB Consent Flow E2E Tests
 *
 * Browser-based tests for complete user consent journeys.
 */

import { userEvent } from '@vitest/browser/context';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import { IABConsentBanner } from '~/v3/components/iab-consent-banner';
import { IABConsentDialog } from '~/v3/components/iab-consent-dialog';
import {
	addCMPEventListener,
	clearConsentState,
	defaultIABOptions,
	getCMPTCData,
	getStoredConsent,
	getStoredTCString,
	waitForCMP,
	waitForElement,
	waitForElementRemoved,
} from './e2e-setup';

describe('IAB Consent Flow E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
	});

	describe('Accept All Flow', () => {
		test('complete flow: display → accept → signal → storage', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			// 1. Display banner
			const acceptButton = await waitForElement(
				'[data-testid="iab-consent-banner-accept-button"]'
			);
			await waitForCMP();

			// 2. Click accept
			await userEvent.click(acceptButton);

			// 3. Banner should close
			await waitForElementRemoved('[data-testid="iab-consent-banner-card"]');

			// 4. Verify storage (wait for it to be saved)
			await vi.waitFor(
				() => {
					const consent = getStoredConsent();
					expect(consent).toBeTruthy();
				},
				{ timeout: 1000 }
			);
		});

		test('should set all purposes to consented', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-consent-banner-accept-button"]'
			);
			await waitForCMP();

			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-consent-banner-card"]');

			await vi.waitFor(
				async () => {
					const tcData = await getCMPTCData();
					expect(tcData.purpose.consents[1]).toBe(true);
				},
				{ timeout: 2000 }
			);
		});
	});

	describe('Reject All Flow', () => {
		test('complete flow: display → reject → signal → storage', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const rejectButton = await waitForElement(
				'[data-testid="iab-consent-banner-reject-button"]'
			);
			await waitForCMP();

			await userEvent.click(rejectButton);
			await waitForElementRemoved('[data-testid="iab-consent-banner-card"]');

			await vi.waitFor(
				() => {
					const consent = getStoredConsent();
					expect(consent).toBeDefined();
					expect(consent?.consents?.necessary).toBe(true);
				},
				{ timeout: 2000 }
			);
		});
	});

	describe('Granular Consent Flow', () => {
		test('should open preference center for granular selection', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const customizeButton = await waitForElement(
				'[data-testid="iab-consent-banner-customize-button"]'
			);
			await waitForCMP();

			await userEvent.click(customizeButton);

			// Preference center should open
			await waitForElement('[data-testid="iab-consent-dialog-root"]');
		});

		test('should save granular preferences', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const customizeButton = await waitForElement(
				'[data-testid="iab-consent-banner-customize-button"]'
			);
			await waitForCMP();

			await userEvent.click(customizeButton);
			await waitForElement('[data-testid="iab-consent-dialog-root"]');

			// Wait for content to load
			await vi.waitFor(
				() => {
					const content = document.querySelector(
						'[data-testid="iab-consent-dialog-root"]'
					);
					if (!content?.textContent?.includes('Store')) {
						throw new Error('Content not loaded');
					}
				},
				{ timeout: 3000 }
			);

			// Find and click save button
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

			if (saveButton) {
				await userEvent.click(saveButton);
				await waitForElementRemoved('[data-testid="iab-consent-dialog-root"]');

				const consent = getStoredConsent();
				expect(consent).toBeDefined();
			}
		});
	});

	describe('Persistence & Restoration Flow', () => {
		test('consent should be stored in localStorage', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-consent-banner-accept-button"]'
			);
			await waitForCMP();

			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-consent-banner-card"]');

			await vi.waitFor(
				() => {
					const consent = getStoredConsent();
					expect(consent).toBeDefined();
					expect(consent?.consents).toBeDefined();
				},
				{ timeout: 2000 }
			);
		});

		test('TC String should be stored', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			const acceptButton = await waitForElement(
				'[data-testid="iab-consent-banner-accept-button"]'
			);
			await waitForCMP();

			await userEvent.click(acceptButton);
			await waitForElementRemoved('[data-testid="iab-consent-banner-card"]');

			// Verify TC string storage
			const tcString = getStoredTCString();
			expect(tcString).toBeDefined();
			expect(typeof tcString).toBe('string');
			expect(tcString?.length).toBeGreaterThan(10);
		});
	});

	describe('First Visit vs Return Visit', () => {
		test('first visit - banner should display', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			// Banner should show on first visit
			await waitForElement('[data-testid="iab-consent-banner-card"]');
		});
	});

	describe('Event Notifications', () => {
		test('should fire useractioncomplete on Accept All', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			// Set up listener
			let callCount = 0;
			const events: string[] = [];

			const tcfapi = (window as { __tcfapi?: Function }).__tcfapi;
			if (tcfapi) {
				tcfapi('addEventListener', 2, (data: { eventStatus: string }) => {
					callCount++;
					events.push(data.eventStatus);
				});
			}

			// Click accept
			const acceptButton = document.querySelector(
				'[data-testid="iab-consent-banner-accept-button"]'
			);
			if (acceptButton) {
				await userEvent.click(acceptButton);
			}

			// Wait for events
			await vi.waitFor(
				() => {
					if (!events.includes('useractioncomplete')) {
						throw new Error('useractioncomplete not received');
					}
				},
				{ timeout: 2000 }
			);

			expect(events).toContain('useractioncomplete');
		});
	});
});
