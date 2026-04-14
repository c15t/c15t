/**
 * Event System Tests for IAB TCF 2.3
 *
 * Tests for IAB TCF event handling and listener behavior.
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCMPApi } from '../../tcf/cmp-api';
import type { GlobalVendorList, TCData } from '../../tcf/iab-tcf-types';
import { destroyIABStub, initializeIABStub } from '../../tcf/stub';
import type { CMPApi } from '../../tcf/types';
import {
	cleanupTCFApi,
	createMockConsentEvent,
	createMockGVL,
	setupStorageMock,
} from './test-setup';

describe('Event System - IAB TCF 2.3', () => {
	let cmpApi: CMPApi;
	let mockGVL: GlobalVendorList;
	let storageMock: ReturnType<typeof setupStorageMock>;

	beforeEach(() => {
		cleanupTCFApi();
		initializeIABStub();
		mockGVL = createMockGVL();
		storageMock = setupStorageMock();

		cmpApi = createCMPApi({
			cmpId: 28,
			cmpVersion: 1,
			gvl: mockGVL,
			gdprApplies: true,
		});
	});

	afterEach(() => {
		cmpApi?.destroy();
		destroyIABStub();
		cleanupTCFApi();
		storageMock.cleanup();
	});

	describe('Event Status Values', () => {
		it('should emit "tcloaded" when TC String is available and UI not shown', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					expect(tcData?.eventStatus).toBe('tcloaded');
					resolve();
				});
			});
		});

		it('should emit "cmpuishown" when UI is displayed', async () => {
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					callCount++;
					if (callCount === 1) {
						// First call is tcloaded
						expect(tcData?.eventStatus).toBe('tcloaded');
						// Show the UI after first callback
						cmpApi.setDisplayStatus('visible');
					}
					if (callCount === 2) {
						// Second call after showing UI
						expect(tcData?.eventStatus).toBe('cmpuishown');
						resolve();
					}
				});
			});
		});

		it('should emit "useractioncomplete" when user confirms choices', async () => {
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					callCount++;
					if (callCount === 1) {
						// Initial callback, trigger user action
						cmpApi.updateConsent('new-tc-string-from-user');
					}
					if (callCount === 2) {
						expect(tcData?.eventStatus).toBe('useractioncomplete');
						resolve();
					}
				});
			});
		});
	});

	describe('Listener Behavior', () => {
		it('should invoke callback immediately on registration', async () => {
			const startTime = Date.now();

			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'addEventListener',
					2,
					(tcData: TCData | null, success) => {
						const elapsed = Date.now() - startTime;

						expect(success).toBe(true);
						expect(tcData).toBeDefined();
						// Should be called almost immediately (within 100ms)
						expect(elapsed).toBeLessThan(100);
						resolve();
					}
				);
			});
		});

		it('should invoke callback on every TC String change', async () => {
			let callCount = 0;
			const tcStrings: string[] = [];

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					callCount++;
					if (tcData?.tcString) {
						tcStrings.push(tcData.tcString);
					}
					if (callCount === 1) {
						resolve();
					}
				});
			});

			// Update consent multiple times
			cmpApi.updateConsent('tc-string-1');
			await new Promise((r) => setTimeout(r, 10));

			cmpApi.updateConsent('tc-string-2');
			await new Promise((r) => setTimeout(r, 10));

			cmpApi.updateConsent('tc-string-3');
			await new Promise((r) => setTimeout(r, 10));

			// Should have been called 4 times: initial + 3 updates
			expect(callCount).toBe(4);
		});

		it('should stop calling listener after removal', async () => {
			let callCount = 0;
			let listenerId: number | undefined;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					callCount++;
					listenerId = tcData?.listenerId;
					resolve();
				});
			});

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
			cmpApi.updateConsent('new-tc-string');
			await new Promise((r) => setTimeout(r, 50));

			// Should only have initial call
			expect(callCount).toBe(1);
		});

		it('should notify multiple listeners with same updates', async () => {
			const listener1Calls: string[] = [];
			const listener2Calls: string[] = [];
			const listener3Calls: string[] = [];

			// Add three listeners
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					listener1Calls.push(tcData?.eventStatus || '');
					if (listener1Calls.length === 1) resolve();
				});
			});

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					listener2Calls.push(tcData?.eventStatus || '');
					if (listener2Calls.length === 1) resolve();
				});
			});

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					listener3Calls.push(tcData?.eventStatus || '');
					if (listener3Calls.length === 1) resolve();
				});
			});

			// Update consent
			cmpApi.updateConsent('shared-tc-string');
			await new Promise((r) => setTimeout(r, 50));

			// All listeners should have received 2 calls: initial + update
			expect(listener1Calls.length).toBe(2);
			expect(listener2Calls.length).toBe(2);
			expect(listener3Calls.length).toBe(2);

			// All should have received useractioncomplete for the update
			expect(listener1Calls[1]).toBe('useractioncomplete');
			expect(listener2Calls[1]).toBe('useractioncomplete');
			expect(listener3Calls[1]).toBe('useractioncomplete');
		});

		it('should assign unique listenerIds to each listener', async () => {
			const listenerIds: number[] = [];

			for (let i = 0; i < 5; i++) {
				await new Promise<void>((resolve) => {
					window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
						if (tcData?.listenerId !== undefined) {
							listenerIds.push(tcData.listenerId);
						}
						resolve();
					});
				});
			}

			// All IDs should be unique
			const uniqueIds = new Set(listenerIds);
			expect(uniqueIds.size).toBe(5);
		});
	});

	describe('Event Data Completeness', () => {
		it('should include complete TCData in each event', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					expect(tcData).toBeDefined();

					// Required fields
					expect(tcData).toHaveProperty('tcString');
					expect(tcData).toHaveProperty('eventStatus');
					expect(tcData).toHaveProperty('cmpStatus');
					expect(tcData).toHaveProperty('listenerId');
					expect(tcData).toHaveProperty('gdprApplies');
					expect(tcData).toHaveProperty('isServiceSpecific');
					expect(tcData).toHaveProperty('publisherCC');
					expect(tcData).toHaveProperty('purposeOneTreatment');
					expect(tcData).toHaveProperty('purpose');
					expect(tcData).toHaveProperty('vendor');
					expect(tcData).toHaveProperty('specialFeatureOptins');
					expect(tcData).toHaveProperty('publisher');

					resolve();
				});
			});
		});

		it('should match eventStatus to current state', async () => {
			const statuses: string[] = [];

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					if (tcData?.eventStatus) {
						statuses.push(tcData.eventStatus);
					}
					if (statuses.length === 1) resolve();
				});
			});

			cmpApi.setDisplayStatus('visible');
			await new Promise((r) => setTimeout(r, 20));

			cmpApi.updateConsent('test-tc');
			await new Promise((r) => setTimeout(r, 20));

			expect(statuses).toContain('tcloaded');
			expect(statuses).toContain('cmpuishown');
			expect(statuses).toContain('useractioncomplete');
		});

		it('should include correct listenerId in each callback', async () => {
			const listener1Id = await new Promise<number>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					if (tcData?.listenerId !== undefined) {
						resolve(tcData.listenerId);
					}
				});
			});

			const listener2Id = await new Promise<number>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					if (tcData?.listenerId !== undefined) {
						resolve(tcData.listenerId);
					}
				});
			});

			expect(typeof listener1Id).toBe('number');
			expect(typeof listener2Id).toBe('number');
			expect(listener1Id).not.toBe(listener2Id);
		});
	});

	describe('Mock Event Factory', () => {
		it('should create tcloaded event', () => {
			const event = createMockConsentEvent('tcloaded');
			expect(event.eventStatus).toBe('tcloaded');
			expect(event.cmpStatus).toBe('loaded');
		});

		it('should create cmpuishown event', () => {
			const event = createMockConsentEvent('cmpuishown');
			expect(event.eventStatus).toBe('cmpuishown');
		});

		it('should create useractioncomplete event', () => {
			const event = createMockConsentEvent('useractioncomplete');
			expect(event.eventStatus).toBe('useractioncomplete');
		});

		it('should accept overrides', () => {
			const event = createMockConsentEvent('tcloaded', {
				tcString: 'custom-tc-string',
				listenerId: 42,
				cmpStatus: 'loaded',
			});

			expect(event.tcString).toBe('custom-tc-string');
			expect(event.listenerId).toBe(42);
			expect(event.cmpStatus).toBe('loaded');
		});

		it('should include all required TCData fields', () => {
			const event = createMockConsentEvent('tcloaded');

			// Check all required fields
			expect(event).toHaveProperty('eventStatus');
			expect(event).toHaveProperty('tcString');
			expect(event).toHaveProperty('listenerId');
			expect(event).toHaveProperty('cmpStatus');
			expect(event).toHaveProperty('gdprApplies');
			expect(event).toHaveProperty('isServiceSpecific');
			expect(event).toHaveProperty('useNonStandardTexts');
			expect(event).toHaveProperty('publisherCC');
			expect(event).toHaveProperty('purposeOneTreatment');
			expect(event).toHaveProperty('purpose');
			expect(event).toHaveProperty('vendor');
			expect(event).toHaveProperty('specialFeatureOptins');
			expect(event).toHaveProperty('publisher');
		});
	});

	describe('Edge Cases', () => {
		it('should handle rapid consent updates', async () => {
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, () => {
					callCount++;
					if (callCount === 1) resolve();
				});
			});

			// Rapid updates
			for (let i = 0; i < 10; i++) {
				cmpApi.updateConsent(`tc-string-${i}`);
			}

			await new Promise((r) => setTimeout(r, 100));

			// Should have called for each update
			expect(callCount).toBe(11); // 1 initial + 10 updates
		});

		it('should handle listener removal during callback', async () => {
			let listenerId: number | undefined;
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					callCount++;
					listenerId = tcData?.listenerId;

					// Remove self on second call
					if (callCount === 2 && listenerId !== undefined) {
						window.__tcfapi?.('removeEventListener', 2, () => {}, listenerId);
					}

					if (callCount === 1) resolve();
				});
			});

			// Trigger updates
			cmpApi.updateConsent('tc-1');
			await new Promise((r) => setTimeout(r, 20));

			cmpApi.updateConsent('tc-2');
			await new Promise((r) => setTimeout(r, 20));

			cmpApi.updateConsent('tc-3');
			await new Promise((r) => setTimeout(r, 20));

			// Should have stopped after self-removal
			expect(callCount).toBe(2);
		});

		it('should not crash when removing non-existent listener', async () => {
			const result = await new Promise<boolean>((resolve) => {
				window.__tcfapi?.(
					'removeEventListener',
					2,
					(success: boolean | null) => {
						resolve(success === true);
					},
					999999
				);
			});

			expect(result).toBe(false);
		});
	});
});
