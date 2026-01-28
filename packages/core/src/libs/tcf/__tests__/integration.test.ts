/**
 * Integration tests for IAB TCF full consent flow.
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlobalVendorList } from '../../../types/iab-tcf';
import { createCMPApi } from '../cmp-api';
import { clearGVLCache, fetchGVL } from '../fetch-gvl';
import {
	c15tConsentsToIabPurposes,
	iabPurposesToC15tConsents,
} from '../purpose-mapping';
import { destroyIABStub, initializeIABStub } from '../stub';
import type { CMPApi } from '../types';
import {
	cleanupTCFApi,
	createMockGVL,
	createMockTCFConsentAllGranted,
	setupFetchMock,
	setupStorageMock,
} from './test-setup';

describe('IAB TCF Integration', () => {
	let fetchMock: ReturnType<typeof setupFetchMock>;
	let storageMock: ReturnType<typeof setupStorageMock>;
	let cmpApi: CMPApi;
	let gvl: GlobalVendorList;

	beforeEach(async () => {
		// Clear all caches
		cleanupTCFApi();
		clearGVLCache();

		// Setup mocks
		const mockGVL = createMockGVL();
		fetchMock = setupFetchMock(mockGVL);
		storageMock = setupStorageMock();

		// Initialize IAB flow
		initializeIABStub();

		// Fetch GVL
		gvl = await fetchGVL([1, 2, 10, 755]);

		// Create CMP API
		cmpApi = createCMPApi({
			cmpId: 28,
			cmpVersion: 1,
			gvl,
			gdprApplies: true,
		});
	});

	afterEach(() => {
		cmpApi?.destroy();
		destroyIABStub();
		cleanupTCFApi();
		clearGVLCache();
		fetchMock.cleanup();
		storageMock.cleanup();
	});

	describe('Full Consent Flow', () => {
		it('should complete init -> display -> save -> notify flow', async () => {
			// 1. Verify GVL is fetched
			expect(gvl).toBeDefined();
			expect(gvl.vendors).toBeDefined();

			// 2. Verify __tcfapi is available
			expect(window.__tcfapi).toBeDefined();

			// 3. Verify ping returns correct status
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (data, success) => {
					expect(success).toBe(true);
					expect(data?.cmpLoaded).toBe(true);
					expect(data?.cmpStatus).toBe('loaded');
					resolve();
				});
			});

			// 4. Set display status to visible
			cmpApi.setDisplayStatus('visible');

			// 5. Simulate user consent (accept all)
			const mockTcString = 'mock-tc-string-from-user-action';
			cmpApi.updateConsent(mockTcString);

			// 6. Verify TC string is stored
			expect(cmpApi.getTcString()).toBe(mockTcString);

			// 7. Verify event listeners are notified
			await new Promise<void>((resolve) => {
				let notificationReceived = false;

				window.__tcfapi?.('addEventListener', 2, (data) => {
					if (data?.eventStatus === 'tcloaded' && !notificationReceived) {
						notificationReceived = true;
						expect(data.tcString).toBe(mockTcString);
						resolve();
					}
				});
			});
		});

		it('should restore consent from storage on page reload', async () => {
			// Save consent
			const savedTcString = 'saved-tc-string-for-reload';
			cmpApi.saveToStorage(savedTcString);

			// Create new CMP API (simulating page reload)
			cmpApi.destroy();
			cmpApi = createCMPApi({
				cmpId: 28,
				gvl,
			});

			// Load from storage
			const loadedTcString = cmpApi.loadFromStorage();
			expect(loadedTcString).toBe(savedTcString);
		});

		it('should handle consent revocation', async () => {
			// Grant consent first
			const fullConsent = 'full-consent-tc-string';
			cmpApi.updateConsent(fullConsent);
			expect(cmpApi.getTcString()).toBe(fullConsent);

			// Revoke consent (update with partial consent)
			const partialConsent = 'partial-consent-tc-string';
			cmpApi.updateConsent(partialConsent);
			expect(cmpApi.getTcString()).toBe(partialConsent);

			// Verify event listeners receive update
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (data) => {
					if (data?.eventStatus === 'tcloaded') {
						expect(data.tcString).toBe(partialConsent);
						resolve();
					}
				});
			});
		});
	});

	describe('Consent Mapping Integration', () => {
		it('should convert c15t consents to IAB purposes and back', () => {
			const c15tConsents = {
				necessary: true,
				marketing: true,
				experience: true,
				measurement: true,
				functionality: true,
			};

			// Convert to IAB purposes
			const iabPurposes = c15tConsentsToIabPurposes(c15tConsents);

			// All purposes should be true
			for (let i = 1; i <= 11; i++) {
				expect(iabPurposes[i]).toBe(true);
			}

			// Convert back to c15t
			const backToC15t = iabPurposesToC15tConsents(iabPurposes);

			expect(backToC15t).toEqual(c15tConsents);
		});

		it('should handle partial consent correctly', () => {
			const c15tConsents = {
				necessary: true,
				marketing: false, // Reject marketing
				experience: true,
				measurement: true,
				functionality: false, // Reject functionality
			};

			const iabPurposes = c15tConsentsToIabPurposes(c15tConsents);

			// Marketing purposes (2, 3, 4) should be false
			expect(iabPurposes[2]).toBe(false);
			expect(iabPurposes[3]).toBe(false);
			expect(iabPurposes[4]).toBe(false);

			// Functionality purposes (10, 11) should be false
			expect(iabPurposes[10]).toBe(false);
			expect(iabPurposes[11]).toBe(false);

			// Other purposes should be true
			expect(iabPurposes[1]).toBe(true);
			expect(iabPurposes[5]).toBe(true);
			expect(iabPurposes[6]).toBe(true);
			expect(iabPurposes[7]).toBe(true);
			expect(iabPurposes[8]).toBe(true);
			expect(iabPurposes[9]).toBe(true);
		});
	});

	describe('GVL Integration', () => {
		it('should fetch and cache GVL correctly', async () => {
			// First fetch
			const gvl1 = await fetchGVL([1, 2]);
			expect(fetchMock.mockFetch).toHaveBeenCalledTimes(1);

			// Second fetch with same vendors (should use cache)
			const gvl2 = await fetchGVL([1, 2]);
			expect(fetchMock.mockFetch).toHaveBeenCalledTimes(1); // Still 1

			// Both should be the same
			expect(gvl1).toEqual(gvl2);
		});

		it('should include configured vendors in GVL', () => {
			expect(gvl.vendors[1]).toBeDefined();
			expect(gvl.vendors[2]).toBeDefined();
			expect(gvl.vendors[10]).toBeDefined();
			expect(gvl.vendors[755]).toBeDefined();
		});
	});

	describe('Event Listener Integration', () => {
		it('should notify multiple listeners on consent change', async () => {
			const listener1Calls: string[] = [];
			const listener2Calls: string[] = [];

			// Add first listener
			window.__tcfapi?.('addEventListener', 2, (data) => {
				if (data?.eventStatus) {
					listener1Calls.push(data.eventStatus);
				}
			});

			// Add second listener
			window.__tcfapi?.('addEventListener', 2, (data) => {
				if (data?.eventStatus) {
					listener2Calls.push(data.eventStatus);
				}
			});

			// Both should have received initial tcloaded
			expect(listener1Calls).toContain('tcloaded');
			expect(listener2Calls).toContain('tcloaded');

			// Update consent
			cmpApi.updateConsent('new-consent');

			// Wait for async notification
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Both should have received useractioncomplete
			expect(listener1Calls).toContain('useractioncomplete');
			expect(listener2Calls).toContain('useractioncomplete');
		});

		it('should stop notifying removed listeners', async () => {
			let listenerCalls = 0;
			let listenerId: number | undefined;

			// Add listener
			window.__tcfapi?.('addEventListener', 2, (data) => {
				listenerCalls++;
				if (data?.listenerId !== undefined) {
					listenerId = data.listenerId;
				}
			});

			expect(listenerCalls).toBe(1); // Initial call

			// Remove listener
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'removeEventListener',
					2,
					() => resolve(),
					listenerId
				);
			});

			// Update consent
			cmpApi.updateConsent('another-consent');

			// Wait for potential async notification
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Should not have received another call
			expect(listenerCalls).toBe(1);
		});
	});

	describe('CMP API Commands Integration', () => {
		it('should handle all standard commands', async () => {
			const commands = ['ping', 'getTCData', 'getVendorList'] as const;

			for (const command of commands) {
				await new Promise<void>((resolve) => {
					window.__tcfapi?.(command, 2, (data, success) => {
						expect(success).toBe(true);
						expect(data).toBeDefined();
						resolve();
					});
				});
			}
		});

		it('should handle getInAppTCData as alias for getTCData', async () => {
			let tcData: unknown;
			let inAppTcData: unknown;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (data) => {
					tcData = data;
					resolve();
				});
			});

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getInAppTCData', 2, (data) => {
					inAppTcData = data;
					resolve();
				});
			});

			// Both should have similar structure
			expect(tcData).toHaveProperty('tcString');
			expect(inAppTcData).toHaveProperty('tcString');
		});
	});
});
