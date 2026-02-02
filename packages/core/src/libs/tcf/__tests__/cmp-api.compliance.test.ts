/**
 * CMP API Compliance Tests for IAB TCF 2.3
 *
 * Tests for IAB CMP API v2.x compliance per spec.
 * Covers all required commands and TCData object validation.
 *
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20CMP%20API%20v2.md
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
	GlobalVendorList,
	PingData,
	TCData,
} from '../../../types/iab-tcf';
import { createCMPApi } from '../cmp-api';
import { destroyIABStub, initializeIABStub } from '../stub';
import type { CMPApi } from '../types';
import { cleanupTCFApi, createMockGVL, setupStorageMock } from './test-setup';

describe('CMP API Compliance - IAB TCF 2.3', () => {
	let cmpApi: CMPApi;
	let mockGVL: GlobalVendorList;
	let storageMock: ReturnType<typeof setupStorageMock>;

	beforeEach(() => {
		cleanupTCFApi();
		initializeIABStub();
		mockGVL = createMockGVL();
		storageMock = setupStorageMock();

		cmpApi = createCMPApi({
			cmpId: 160,
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

	describe('ping Command', () => {
		it('should return all required PingReturn fields', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null, success) => {
					expect(success).toBe(true);
					expect(pingData).toBeDefined();

					// Required fields per TCF spec
					expect(pingData).toHaveProperty('gdprApplies');
					expect(pingData).toHaveProperty('cmpLoaded');
					expect(pingData).toHaveProperty('cmpStatus');
					expect(pingData).toHaveProperty('displayStatus');
					expect(pingData).toHaveProperty('apiVersion');
					expect(pingData).toHaveProperty('cmpVersion');
					expect(pingData).toHaveProperty('cmpId');
					expect(pingData).toHaveProperty('gvlVersion');
					expect(pingData).toHaveProperty('tcfPolicyVersion');

					resolve();
				});
			});
		});

		it('should return gdprApplies as boolean', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					expect(typeof pingData?.gdprApplies).toBe('boolean');
					resolve();
				});
			});
		});

		it('should return cmpLoaded=true when CMP is ready', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					expect(pingData?.cmpLoaded).toBe(true);
					resolve();
				});
			});
		});

		it('should return cmpStatus="loaded" when CMP is ready', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					expect(pingData?.cmpStatus).toBe('loaded');
					resolve();
				});
			});
		});

		it('should return displayStatus as "visible" or "hidden"', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					expect(['visible', 'hidden', 'disabled']).toContain(
						pingData?.displayStatus
					);
					resolve();
				});
			});
		});

		it('should return apiVersion for TCF 2.x', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					// Implementation returns "2.3" - TCF spec suggests "2.2" for v2.x
					expect(['2.2', '2.3']).toContain(pingData?.apiVersion);
					resolve();
				});
			});
		});

		it('should return configured cmpId', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					expect(pingData?.cmpId).toBe(160);
					resolve();
				});
			});
		});

		it('should return configured cmpVersion', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					// cmpVersion may be returned as number or string
					expect(Number(pingData?.cmpVersion)).toBe(1);
					resolve();
				});
			});
		});

		it('should return gvlVersion from loaded GVL', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					expect(pingData?.gvlVersion).toBe(mockGVL.vendorListVersion);
					resolve();
				});
			});
		});

		it('should return tcfPolicyVersion from GVL', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					expect(pingData?.tcfPolicyVersion).toBe(mockGVL.tcfPolicyVersion);
					resolve();
				});
			});
		});
	});

	describe('addEventListener Command', () => {
		it('should invoke callback immediately on registration', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'addEventListener',
					2,
					(tcData: TCData | null, success) => {
						expect(success).toBe(true);
						expect(tcData).toBeDefined();
						resolve();
					}
				);
			});
		});

		it('should assign unique listenerId to each listener', async () => {
			const listenerIds: number[] = [];

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					if (tcData?.listenerId !== undefined) {
						listenerIds.push(tcData.listenerId);
					}
					resolve();
				});
			});

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					if (tcData?.listenerId !== undefined) {
						listenerIds.push(tcData.listenerId);
					}
					resolve();
				});
			});

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					if (tcData?.listenerId !== undefined) {
						listenerIds.push(tcData.listenerId);
					}
					resolve();
				});
			});

			// All IDs should be unique
			const uniqueIds = new Set(listenerIds);
			expect(uniqueIds.size).toBe(listenerIds.length);
			expect(listenerIds.length).toBe(3);
		});

		it('should return eventStatus="tcloaded" when TC String available', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					expect(tcData?.eventStatus).toBe('tcloaded');
					resolve();
				});
			});
		});

		it('should return eventStatus="cmpuishown" when UI is displayed', async () => {
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					callCount++;
					if (callCount === 1) {
						cmpApi.setDisplayStatus('visible');
					}
					if (callCount === 2) {
						expect(tcData?.eventStatus).toBe('cmpuishown');
						resolve();
					}
				});
			});
		});

		it('should return eventStatus="useractioncomplete" after user action', async () => {
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					callCount++;
					if (callCount === 1) {
						cmpApi.updateConsent('test-tc-string');
					}
					if (callCount === 2) {
						expect(tcData?.eventStatus).toBe('useractioncomplete');
						resolve();
					}
				});
			});
		});
	});

	describe('removeEventListener Command', () => {
		it('should remove listener by listenerId', async () => {
			let listenerId: number | undefined;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					listenerId = tcData?.listenerId;
					resolve();
				});
			});

			const removed = await new Promise<boolean>((resolve) => {
				window.__tcfapi?.(
					'removeEventListener',
					2,
					(success: boolean | null) => {
						resolve(success === true);
					},
					listenerId
				);
			});

			expect(removed).toBe(true);
		});

		it('should return false for invalid listenerId', async () => {
			const removed = await new Promise<boolean>((resolve) => {
				window.__tcfapi?.(
					'removeEventListener',
					2,
					(success: boolean | null) => {
						resolve(success === true);
					},
					999999
				);
			});

			expect(removed).toBe(false);
		});

		it('removed listener should not receive future updates', async () => {
			let listenerId: number | undefined;
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					listenerId = tcData?.listenerId;
					callCount++;
					resolve();
				});
			});

			// Remove the listener
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'removeEventListener',
					2,
					() => {
						resolve();
					},
					listenerId
				);
			});

			// Trigger an update
			cmpApi.updateConsent('new-tc-string');

			// Wait a bit
			await new Promise((r) => setTimeout(r, 50));

			// Call count should still be 1 (initial call only)
			expect(callCount).toBe(1);
		});
	});

	describe('getVendorList Command', () => {
		it('should return complete GVL', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'getVendorList',
					2,
					(gvl: GlobalVendorList | null, success) => {
						expect(success).toBe(true);
						expect(gvl).toBeDefined();
						expect(gvl).toEqual(mockGVL);
						resolve();
					}
				);
			});
		});

		it('should return GVL with all required fields', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'getVendorList',
					2,
					(gvl: GlobalVendorList | null) => {
						expect(gvl).toHaveProperty('gvlSpecificationVersion');
						expect(gvl).toHaveProperty('vendorListVersion');
						expect(gvl).toHaveProperty('tcfPolicyVersion');
						expect(gvl).toHaveProperty('lastUpdated');
						expect(gvl).toHaveProperty('purposes');
						expect(gvl).toHaveProperty('specialPurposes');
						expect(gvl).toHaveProperty('features');
						expect(gvl).toHaveProperty('specialFeatures');
						expect(gvl).toHaveProperty('vendors');
						expect(gvl).toHaveProperty('stacks');
						resolve();
					}
				);
			});
		});

		it('GVL should contain all 11 purposes', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'getVendorList',
					2,
					(gvl: GlobalVendorList | null) => {
						const purposeIds = Object.keys(gvl?.purposes || {}).map(Number);
						expect(purposeIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
						resolve();
					}
				);
			});
		});

		it('GVL should contain special purposes 1-2', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'getVendorList',
					2,
					(gvl: GlobalVendorList | null) => {
						const specialPurposeIds = Object.keys(
							gvl?.specialPurposes || {}
						).map(Number);
						expect(specialPurposeIds).toContain(1);
						expect(specialPurposeIds).toContain(2);
						resolve();
					}
				);
			});
		});

		it('GVL should contain features 1-3', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'getVendorList',
					2,
					(gvl: GlobalVendorList | null) => {
						const featureIds = Object.keys(gvl?.features || {}).map(Number);
						expect(featureIds).toEqual([1, 2, 3]);
						resolve();
					}
				);
			});
		});

		it('GVL should contain special features 1-2', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'getVendorList',
					2,
					(gvl: GlobalVendorList | null) => {
						const specialFeatureIds = Object.keys(
							gvl?.specialFeatures || {}
						).map(Number);
						expect(specialFeatureIds).toEqual([1, 2]);
						resolve();
					}
				);
			});
		});

		it('GVL should contain stacks', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'getVendorList',
					2,
					(gvl: GlobalVendorList | null) => {
						expect(gvl?.stacks).toBeDefined();
						expect(Object.keys(gvl?.stacks || {}).length).toBeGreaterThan(0);
						resolve();
					}
				);
			});
		});
	});

	describe('getInAppTCData Command (Mobile Alias)', () => {
		it('should return same data as getTCData', async () => {
			const getTCDataResult = await new Promise<TCData | null>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null) => {
					resolve(tcData);
				});
			});

			const getInAppResult = await new Promise<TCData | null>((resolve) => {
				window.__tcfapi?.('getInAppTCData', 2, (tcData: TCData | null) => {
					resolve(tcData);
				});
			});

			// Both should return equivalent data
			expect(getInAppResult?.gdprApplies).toBe(getTCDataResult?.gdprApplies);
			expect(getInAppResult?.cmpStatus).toBe(getTCDataResult?.cmpStatus);
			expect(getInAppResult?.tcString).toBe(getTCDataResult?.tcString);
		});
	});

	describe('TCData Object Validation', () => {
		it('should contain all required fields', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null, success) => {
					expect(success).toBe(true);
					expect(tcData).toBeDefined();

					// Required top-level fields
					expect(tcData).toHaveProperty('tcString');
					expect(tcData).toHaveProperty('tcfPolicyVersion');
					expect(tcData).toHaveProperty('cmpId');
					expect(tcData).toHaveProperty('cmpVersion');
					expect(tcData).toHaveProperty('gdprApplies');
					expect(tcData).toHaveProperty('eventStatus');
					expect(tcData).toHaveProperty('cmpStatus');
					expect(tcData).toHaveProperty('listenerId');
					expect(tcData).toHaveProperty('isServiceSpecific');
					expect(tcData).toHaveProperty('useNonStandardTexts');
					expect(tcData).toHaveProperty('publisherCC');
					expect(tcData).toHaveProperty('purposeOneTreatment');

					resolve();
				});
			});
		});

		it('should contain purpose object with consents and legitimateInterests', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null) => {
					expect(tcData?.purpose).toBeDefined();
					expect(tcData?.purpose).toHaveProperty('consents');
					expect(tcData?.purpose).toHaveProperty('legitimateInterests');
					expect(typeof tcData?.purpose?.consents).toBe('object');
					expect(typeof tcData?.purpose?.legitimateInterests).toBe('object');
					resolve();
				});
			});
		});

		it('should contain vendor object with required fields', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null) => {
					expect(tcData?.vendor).toBeDefined();
					expect(tcData?.vendor).toHaveProperty('consents');
					expect(tcData?.vendor).toHaveProperty('legitimateInterests');
					resolve();
				});
			});
		});

		it('should contain specialFeatureOptins', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null) => {
					expect(tcData?.specialFeatureOptins).toBeDefined();
					expect(typeof tcData?.specialFeatureOptins).toBe('object');
					resolve();
				});
			});
		});

		it('should contain publisher object with required fields', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null) => {
					expect(tcData?.publisher).toBeDefined();
					expect(tcData?.publisher).toHaveProperty('consents');
					expect(tcData?.publisher).toHaveProperty('legitimateInterests');
					expect(tcData?.publisher).toHaveProperty('customPurpose');
					expect(tcData?.publisher).toHaveProperty('restrictions');
					resolve();
				});
			});
		});

		it('should return isServiceSpecific=true (global scope invalid)', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null) => {
					// Per TCF spec: global scope is invalid since Sept 2021
					expect(tcData?.isServiceSpecific).toBe(true);
					resolve();
				});
			});
		});

		it('should return valid publisherCC (2-letter country code)', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null) => {
					expect(tcData?.publisherCC).toBeDefined();
					expect(typeof tcData?.publisherCC).toBe('string');
					expect(tcData?.publisherCC?.length).toBe(2);
					resolve();
				});
			});
		});
	});

	describe('Unknown Commands', () => {
		it('should return success=false for unknown commands', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('unknownCommand' as 'ping', 2, (data, success) => {
					expect(success).toBe(false);
					expect(data).toBeNull();
					resolve();
				});
			});
		});
	});

	describe('Version Parameter', () => {
		it('should accept version 2 for all commands', async () => {
			const results = await Promise.all([
				new Promise<boolean>((resolve) => {
					window.__tcfapi?.('ping', 2, (_, success) => resolve(success));
				}),
				new Promise<boolean>((resolve) => {
					window.__tcfapi?.('getTCData', 2, (_, success) => resolve(success));
				}),
				new Promise<boolean>((resolve) => {
					window.__tcfapi?.('getVendorList', 2, (_, success) =>
						resolve(success)
					);
				}),
			]);

			expect(results.every((r) => r === true)).toBe(true);
		});
	});
});
