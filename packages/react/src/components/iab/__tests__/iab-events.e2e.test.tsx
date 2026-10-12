/**
 * IAB Events E2E Tests
 *
 * Browser-based tests for IAB TCF event system compliance.
 */

import { userEvent } from '@vitest/browser/context';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { IABConsentDialog } from '~/components/iab-panel';
import { IABConsentBanner } from '~/components/iab-prompt';

import type { TcfApiTestFunction } from './e2e-setup';
import {
	addCMPEventListener,
	clearConsentState,
	defaultProviderIABOptions,
	removeCMPEventListener,
	waitForCMP,
	waitForElement,
} from './e2e-setup';

const getDefined = <Value,>(value: Value): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error('Expected value to be defined');
	}
	return value;
};

describe('IAB Events E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
	});

	describe('Event Status Values', () => {
		test('should emit "tcloaded" with the saved TC string for a returning visitor', async () => {
			const firstVisit = await render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);
			const acceptButton = await waitForElement(
				'[data-testid="iab-consent-banner-accept-button"]'
			);
			await waitForCMP();
			await userEvent.click(acceptButton);
			// Saves are queued and written once the write code loads: remount
			// only after both records are stored, as a reload would.
			await vi.waitFor(() => {
				expect(window.localStorage.getItem('euconsent-v2')).toBeTruthy();
				expect(window.localStorage.getItem('c15t')).toBeTruthy();
			});
			await firstVisit.unmount();
			delete (window as { __tcfapi?: unknown }).__tcfapi;

			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);
			await waitForCMP();

			const eventData = await vi.waitFor(async () => {
				const data = await addCMPEventListener();
				expect(data.eventStatus).toBe('tcloaded');
				return data;
			});
			expect(eventData.tcString).toBeTruthy();
			expect(
				document.querySelector('[data-testid="iab-consent-banner-card"]')
			).toBeNull();
		});

		test('should emit "cmpuishown" when UI is displayed', async () => {
			const events: string[] = [];

			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			// Set up listener to capture events
			const tcfapi = (window as { __tcfapi?: TcfApiTestFunction }).__tcfapi;
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

			// The banner is up, so the CMP must not report tcloaded.
			expect(events).toContain('cmpuishown');
			expect(events).not.toContain('tcloaded');
		});

		test('should emit "useractioncomplete" after user action', async () => {
			const events: string[] = [];

			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			// Set up listener
			const tcfapi = (window as { __tcfapi?: TcfApiTestFunction }).__tcfapi;
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

	describe('First visit', () => {
		test('ad tags see the banner, then the choice, and never tcloaded', async () => {
			const events: { eventStatus?: string; tcString: string }[] = [];
			await render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);
			// An ad tag registers as soon as `__tcfapi` exists, stub or not.
			const tcfapi = await vi.waitFor(() =>
				getDefined((window as { __tcfapi?: TcfApiTestFunction }).__tcfapi)
			);
			tcfapi(
				'addEventListener',
				2,
				(data: { eventStatus?: string; tcString: string }) => {
					events.push({
						eventStatus: data.eventStatus,
						tcString: data.tcString,
					});
				}
			);
			const acceptButton = await waitForElement(
				'[data-testid="iab-consent-banner-accept-button"]'
			);
			await waitForCMP();
			await vi.waitFor(() =>
				expect(events.map((event) => event.eventStatus)).toContain('cmpuishown')
			);

			await userEvent.click(acceptButton);
			await vi.waitFor(() =>
				expect(events.map((event) => event.eventStatus)).toContain(
					'useractioncomplete'
				)
			);

			const statuses = events.map((event) => event.eventStatus);
			expect(statuses).not.toContain('tcloaded');
			expect(statuses.indexOf('cmpuishown')).toBeLessThan(
				statuses.indexOf('useractioncomplete')
			);
			const completed = events.find(
				(event) => event.eventStatus === 'useractioncomplete'
			);
			expect(completed?.tcString).toBeTruthy();
		});
	});

	describe('Event Listener Lifecycle', () => {
		test('should invoke listener immediately on registration', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			let called = false;
			const tcfapi = (window as { __tcfapi?: TcfApiTestFunction }).__tcfapi;
			if (tcfapi) {
				tcfapi('addEventListener', 2, () => {
					called = true;
				});
			}

			// Should be called almost immediately
			await vi.waitFor(
				() => {
					if (!called) {
						throw new Error('Not called');
					}
				},
				{ timeout: 100 }
			);

			expect(called).toBe(true);
		});

		test('should assign unique listenerIds', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
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
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);
			await waitForCMP();
			const tcfapi = (window as { __tcfapi?: TcfApiTestFunction }).__tcfapi;
			if (!tcfapi) {
				throw new Error('TCF API is missing');
			}
			const removedListener = vi.fn();
			let listenerId: number | undefined;
			tcfapi('addEventListener', 2, (data: { listenerId: number }) => {
				({ listenerId } = data);
				removedListener(data);
			});
			await vi.waitFor(() => expect(removedListener).toHaveBeenCalledTimes(1));
			if (listenerId === undefined) {
				throw new Error('Listener ID is missing');
			}
			expect(await removeCMPEventListener(listenerId)).toBe(true);
			const activeListener = vi.fn();
			tcfapi('addEventListener', 2, activeListener);
			const acceptButton = await waitForElement(
				'[data-testid="iab-consent-banner-accept-button"]'
			);
			await userEvent.click(acceptButton);
			await vi.waitFor(() =>
				expect(activeListener).toHaveBeenCalledWith(
					expect.objectContaining({ eventStatus: 'useractioncomplete' }),
					true
				)
			);
			expect(removedListener).toHaveBeenCalledTimes(1);
		});

		test('multiple listeners should all receive updates', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const listener1Events: string[] = [];
			const listener2Events: string[] = [];
			const listener3Events: string[] = [];

			const tcfapi = (window as { __tcfapi?: TcfApiTestFunction }).__tcfapi;
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
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			let receivedData: Record<string, unknown> | null = null;

			const tcfapi = (window as { __tcfapi?: TcfApiTestFunction }).__tcfapi;
			if (tcfapi) {
				tcfapi('addEventListener', 2, (data: Record<string, unknown>) => {
					receivedData = data;
				});
			}

			await vi.waitFor(
				() => {
					if (!receivedData) {
						throw new Error('No data received');
					}
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
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const eventData = await addCMPEventListener();

			expect(eventData.listenerId).toBeDefined();
			expect(typeof eventData.listenerId).toBe('number');
		});
	});
});
