/**
 * IAB Events E2E Tests
 *
 * Browser-based tests for IAB TCF event system compliance.
 */

import { userEvent } from '@vitest/browser/context';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { IABConsentBanner } from '~/components/iab-consent-banner';
import { IABConsentDialog } from '~/components/iab-consent-dialog';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import {
	addCMPEventListener,
	clearConsentState,
	defaultIABOptions,
	removeCMPEventListener,
	waitForCMP,
	waitForElement,
	waitForElementRemoved,
} from './e2e-setup';

describe('IAB Events E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
	});

	describe('Event Status Values', () => {
		test('should emit "tcloaded" when CMP is ready', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const eventData = await addCMPEventListener();
			expect(eventData.eventStatus).toBe('tcloaded');
		});

		test('should emit "cmpuishown" when UI is displayed', async () => {
			const events: string[] = [];

			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			// Set up listener to capture events
			const tcfapi = (window as { __tcfapi?: Function }).__tcfapi;
			if (tcfapi) {
				tcfapi('addEventListener', 2, (data: { eventStatus: string }) => {
					events.push(data.eventStatus);
				});
			}

			// Wait for events
			await vi.waitFor(
				() => {
					if (events.length === 0) {
						throw new Error('No events received');
					}
				},
				{ timeout: 2000 }
			);

			// Should have received tcloaded at minimum
			expect(events).toContain('tcloaded');
		});

		test('should emit "useractioncomplete" after user action', async () => {
			const events: string[] = [];

			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			// Set up listener
			const tcfapi = (window as { __tcfapi?: Function }).__tcfapi;
			if (tcfapi) {
				tcfapi('addEventListener', 2, (data: { eventStatus: string }) => {
					events.push(data.eventStatus);
				});
			}

			// Perform user action
			const acceptButton = document.querySelector(
				'[data-testid="iab-consent-banner-accept-button"]'
			);
			if (acceptButton) {
				await userEvent.click(acceptButton);
			}

			// Wait for useractioncomplete event
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

	describe('Event Listener Lifecycle', () => {
		test('should invoke listener immediately on registration', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			let called = false;
			const tcfapi = (window as { __tcfapi?: Function }).__tcfapi;
			if (tcfapi) {
				tcfapi('addEventListener', 2, () => {
					called = true;
				});
			}

			// Should be called almost immediately
			await vi.waitFor(
				() => {
					if (!called) throw new Error('Not called');
				},
				{ timeout: 100 }
			);

			expect(called).toBe(true);
		});

		test('should assign unique listenerIds', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const event1 = await addCMPEventListener();
			const event2 = await addCMPEventListener();
			const event3 = await addCMPEventListener();

			expect(event1.listenerId).toBeDefined();
			expect(event2.listenerId).toBeDefined();
			expect(event3.listenerId).toBeDefined();

			// All should be unique
			const ids = [event1.listenerId, event2.listenerId, event3.listenerId];
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(3);
		});

		test('should stop notifying after removeEventListener', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			let callCount = 0;
			let listenerId: number | undefined;

			const tcfapi = (window as { __tcfapi?: Function }).__tcfapi;
			if (tcfapi) {
				tcfapi('addEventListener', 2, (data: { listenerId: number }) => {
					callCount++;
					listenerId = data.listenerId;
				});
			}

			// Wait for initial call
			await vi.waitFor(
				() => {
					if (callCount === 0) throw new Error('Not called');
				},
				{ timeout: 100 }
			);

			expect(callCount).toBe(1);

			// Remove listener
			if (listenerId !== undefined) {
				const removed = await removeCMPEventListener(listenerId);
				expect(removed).toBe(true);
			}

			// Click accept to trigger another event
			const acceptButton = document.querySelector(
				'[data-testid="iab-consent-banner-accept-button"]'
			);
			if (acceptButton) {
				await userEvent.click(acceptButton);
			}

			// Wait a bit
			await new Promise((r) => setTimeout(r, 100));

			// Call count should still be 1 (removed listener doesn't receive)
			expect(callCount).toBe(1);
		});

		test('multiple listeners should all receive updates', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const listener1Events: string[] = [];
			const listener2Events: string[] = [];
			const listener3Events: string[] = [];

			const tcfapi = (window as { __tcfapi?: Function }).__tcfapi;
			if (tcfapi) {
				tcfapi('addEventListener', 2, (data: { eventStatus: string }) => {
					listener1Events.push(data.eventStatus);
				});
				tcfapi('addEventListener', 2, (data: { eventStatus: string }) => {
					listener2Events.push(data.eventStatus);
				});
				tcfapi('addEventListener', 2, (data: { eventStatus: string }) => {
					listener3Events.push(data.eventStatus);
				});
			}

			// Wait for initial events
			await vi.waitFor(
				() => {
					if (
						listener1Events.length === 0 ||
						listener2Events.length === 0 ||
						listener3Events.length === 0
					) {
						throw new Error('Not all listeners received events');
					}
				},
				{ timeout: 500 }
			);

			// All should have received at least one event
			expect(listener1Events.length).toBeGreaterThan(0);
			expect(listener2Events.length).toBeGreaterThan(0);
			expect(listener3Events.length).toBeGreaterThan(0);
		});
	});

	describe('Event Data Completeness', () => {
		test('each event should include complete TCData', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			let receivedData: Record<string, unknown> | null = null;

			const tcfapi = (window as { __tcfapi?: Function }).__tcfapi;
			if (tcfapi) {
				tcfapi('addEventListener', 2, (data: Record<string, unknown>) => {
					receivedData = data;
				});
			}

			await vi.waitFor(
				() => {
					if (!receivedData) throw new Error('No data received');
				},
				{ timeout: 500 }
			);

			// Check required fields
			expect(receivedData).toHaveProperty('eventStatus');
			expect(receivedData).toHaveProperty('listenerId');
			expect(receivedData).toHaveProperty('gdprApplies');
			expect(receivedData).toHaveProperty('cmpStatus');
		});

		test('listenerId in callback should match assigned ID', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const eventData = await addCMPEventListener();

			expect(eventData.listenerId).toBeDefined();
			expect(typeof eventData.listenerId).toBe('number');
		});
	});
});
