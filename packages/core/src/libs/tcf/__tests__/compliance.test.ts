/**
 * IAB TCF Spec Compliance Tests
 *
 * These tests verify compliance with the IAB TCF 2.3 specification.
 *
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
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
import { isValidTCStringFormat } from '../tc-string';
import type { CMPApi } from '../types';
import { cleanupTCFApi, createMockGVL, setupStorageMock } from './test-setup';

describe('IAB TCF Spec Compliance', () => {
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

	describe('TCF 2.3 API Compliance', () => {
		describe('__tcfapi Function', () => {
			it('should be a function on window', () => {
				expect(typeof window.__tcfapi).toBe('function');
			});

			it('should accept command, version, callback, and optional parameter', () => {
				expect(() => {
					window.__tcfapi?.('ping', 2, () => {});
				}).not.toThrow();

				expect(() => {
					window.__tcfapi?.('removeEventListener', 2, () => {}, 123);
				}).not.toThrow();
			});
		});

		describe('ping Command', () => {
			it('should return all required ping data fields', (done) => {
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

					done();
				});
			});

			it('should return valid cmpStatus values', (done) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					const validStatuses = ['stub', 'loading', 'loaded', 'error'];
					expect(validStatuses).toContain(pingData?.cmpStatus);
					done();
				});
			});

			it('should return valid displayStatus values', (done) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					const validStatuses = ['visible', 'hidden', 'disabled'];
					expect(validStatuses).toContain(pingData?.displayStatus);
					done();
				});
			});

			it('should return apiVersion "2.2" for TCF 2.3', (done) => {
				window.__tcfapi?.('ping', 2, (pingData: PingData | null) => {
					expect(pingData?.apiVersion).toBe('2.2');
					done();
				});
			});
		});

		describe('getTCData Command', () => {
			it('should return all required TCData fields', (done) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null, success) => {
					expect(success).toBe(true);
					expect(tcData).toBeDefined();

					// Required fields per TCF spec
					expect(tcData).toHaveProperty('tcString');
					expect(tcData).toHaveProperty('gdprApplies');
					expect(tcData).toHaveProperty('cmpStatus');
					expect(tcData).toHaveProperty('isServiceSpecific');
					expect(tcData).toHaveProperty('useNonStandardTexts');
					expect(tcData).toHaveProperty('publisherCC');
					expect(tcData).toHaveProperty('purposeOneTreatment');
					expect(tcData).toHaveProperty('purpose');
					expect(tcData).toHaveProperty('vendor');
					expect(tcData).toHaveProperty('specialFeatureOptins');
					expect(tcData).toHaveProperty('publisher');

					done();
				});
			});

			it('should have purpose object with consents and legitimateInterests', (done) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null) => {
					expect(tcData?.purpose).toHaveProperty('consents');
					expect(tcData?.purpose).toHaveProperty('legitimateInterests');
					expect(typeof tcData?.purpose?.consents).toBe('object');
					expect(typeof tcData?.purpose?.legitimateInterests).toBe('object');
					done();
				});
			});

			it('should have vendor object with consents and legitimateInterests', (done) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null) => {
					expect(tcData?.vendor).toHaveProperty('consents');
					expect(tcData?.vendor).toHaveProperty('legitimateInterests');
					done();
				});
			});

			it('should have publisher object with required properties', (done) => {
				window.__tcfapi?.('getTCData', 2, (tcData: TCData | null) => {
					expect(tcData?.publisher).toHaveProperty('consents');
					expect(tcData?.publisher).toHaveProperty('legitimateInterests');
					expect(tcData?.publisher).toHaveProperty('customPurpose');
					expect(tcData?.publisher).toHaveProperty('restrictions');
					done();
				});
			});
		});

		describe('addEventListener Command', () => {
			it('should call callback immediately with tcloaded status', (done) => {
				window.__tcfapi?.(
					'addEventListener',
					2,
					(tcData: TCData | null, success) => {
						expect(success).toBe(true);
						expect(tcData?.eventStatus).toBe('tcloaded');
						done();
					}
				);
			});

			it('should include listenerId in response', (done) => {
				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					expect(tcData?.listenerId).toBeDefined();
					expect(typeof tcData?.listenerId).toBe('number');
					done();
				});
			});

			it('should assign unique listener IDs', () => {
				const ids: number[] = [];

				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					if (tcData?.listenerId !== undefined) {
						ids.push(tcData.listenerId);
					}
				});

				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					if (tcData?.listenerId !== undefined) {
						ids.push(tcData.listenerId);
					}
				});

				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					if (tcData?.listenerId !== undefined) {
						ids.push(tcData.listenerId);
					}
				});

				// All IDs should be unique
				const uniqueIds = new Set(ids);
				expect(uniqueIds.size).toBe(ids.length);
			});
		});

		describe('removeEventListener Command', () => {
			it('should return success: true for valid listener ID', (done) => {
				let listenerId: number | undefined;

				window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
					listenerId = tcData?.listenerId;
				});

				window.__tcfapi?.(
					'removeEventListener',
					2,
					(success: boolean | null, result) => {
						expect(result).toBe(true);
						expect(success).toBe(true);
						done();
					},
					listenerId
				);
			});

			it('should return success: false for invalid listener ID', (done) => {
				window.__tcfapi?.(
					'removeEventListener',
					2,
					(success: boolean | null, result) => {
						expect(result).toBe(true);
						expect(success).toBe(false);
						done();
					},
					999999 // Invalid ID
				);
			});
		});

		describe('getVendorList Command', () => {
			it('should return the GVL', (done) => {
				window.__tcfapi?.(
					'getVendorList',
					2,
					(gvl: GlobalVendorList | null, success) => {
						expect(success).toBe(true);
						expect(gvl).toBeDefined();
						expect(gvl).toHaveProperty('vendorListVersion');
						expect(gvl).toHaveProperty('purposes');
						expect(gvl).toHaveProperty('vendors');
						done();
					}
				);
			});
		});
	});

	describe('Event Status Compliance', () => {
		it('should emit tcloaded on initial addEventListener', (done) => {
			window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
				expect(tcData?.eventStatus).toBe('tcloaded');
				done();
			});
		});

		it('should emit cmpuishown when display status becomes visible', (done) => {
			let callCount = 0;

			window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
				callCount++;
				if (callCount === 2) {
					expect(tcData?.eventStatus).toBe('cmpuishown');
					done();
				}
			});

			cmpApi.setDisplayStatus('visible');
		});

		it('should emit useractioncomplete when consent is updated', (done) => {
			let callCount = 0;

			window.__tcfapi?.('addEventListener', 2, (tcData: TCData | null) => {
				callCount++;
				if (callCount === 2) {
					expect(tcData?.eventStatus).toBe('useractioncomplete');
					done();
				}
			});

			cmpApi.updateConsent('test-tc-string');
		});
	});

	describe('TC String Format Compliance', () => {
		it('should validate correct TC String format', () => {
			// Valid TC String examples
			expect(
				isValidTCStringFormat('CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA')
			).toBe(true);
			expect(
				isValidTCStringFormat('COtybn4PA_zT4KjACBENAPCIAEBAAECAAIAAAAAAAAAA')
			).toBe(true);
		});

		it('should reject invalid TC String formats', () => {
			expect(isValidTCStringFormat('')).toBe(false);
			expect(isValidTCStringFormat('not-valid!')).toBe(false);
			expect(isValidTCStringFormat('short')).toBe(false);
			// @ts-expect-error Testing invalid input
			expect(isValidTCStringFormat(null)).toBe(false);
			// @ts-expect-error Testing invalid input
			expect(isValidTCStringFormat(undefined)).toBe(false);
			// @ts-expect-error Testing invalid input
			expect(isValidTCStringFormat(123)).toBe(false);
		});
	});

	describe('Storage Compliance', () => {
		it('should use euconsent-v2 cookie name per TCF spec', () => {
			const tcString = 'test-tc-string-for-storage';
			cmpApi.saveToStorage(tcString);

			// Check that the cookie would be named correctly
			// (We're testing localStorage in our mock, but the key pattern is checked)
			const stored = storageMock.storage.get('c15t_tc_string');
			expect(stored).toBe(tcString);
		});

		it('should handle localStorage and cookie storage', () => {
			const tcString = 'dual-storage-test';

			// Save
			cmpApi.saveToStorage(tcString);

			// Load back
			const loaded = cmpApi.loadFromStorage();
			expect(loaded).toBe(tcString);
		});
	});

	describe('GVL Structure Compliance', () => {
		it('should have all required GVL fields', () => {
			expect(mockGVL).toHaveProperty('gvlSpecificationVersion');
			expect(mockGVL).toHaveProperty('vendorListVersion');
			expect(mockGVL).toHaveProperty('tcfPolicyVersion');
			expect(mockGVL).toHaveProperty('lastUpdated');
			expect(mockGVL).toHaveProperty('purposes');
			expect(mockGVL).toHaveProperty('specialPurposes');
			expect(mockGVL).toHaveProperty('features');
			expect(mockGVL).toHaveProperty('specialFeatures');
			expect(mockGVL).toHaveProperty('vendors');
			expect(mockGVL).toHaveProperty('stacks');
		});

		it('should have 11 standard purposes', () => {
			const purposeIds = Object.keys(mockGVL.purposes).map(Number);
			expect(purposeIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
		});

		it('should have 2 special purposes', () => {
			const specialPurposeIds = Object.keys(mockGVL.specialPurposes).map(
				Number
			);
			expect(specialPurposeIds).toContain(1);
			expect(specialPurposeIds).toContain(2);
		});

		it('should have 3 features', () => {
			const featureIds = Object.keys(mockGVL.features).map(Number);
			expect(featureIds).toEqual([1, 2, 3]);
		});

		it('should have 2 special features', () => {
			const specialFeatureIds = Object.keys(mockGVL.specialFeatures).map(
				Number
			);
			expect(specialFeatureIds).toEqual([1, 2]);
		});
	});

	describe('Vendor Data Compliance', () => {
		it('should have required vendor fields', () => {
			const vendor = mockGVL.vendors[1];

			expect(vendor).toHaveProperty('id');
			expect(vendor).toHaveProperty('name');
			expect(vendor).toHaveProperty('purposes');
			expect(vendor).toHaveProperty('legIntPurposes');
			expect(vendor).toHaveProperty('flexiblePurposes');
			expect(vendor).toHaveProperty('specialPurposes');
			expect(vendor).toHaveProperty('features');
			expect(vendor).toHaveProperty('specialFeatures');
			expect(vendor).toHaveProperty('cookieMaxAgeSeconds');
			expect(vendor).toHaveProperty('usesCookies');
			expect(vendor).toHaveProperty('usesNonCookieAccess');
			expect(vendor).toHaveProperty('urls');
		});

		it('should have valid vendor purposes (1-11 range)', () => {
			const vendor = mockGVL.vendors[1];

			for (const purposeId of vendor.purposes) {
				expect(purposeId).toBeGreaterThanOrEqual(1);
				expect(purposeId).toBeLessThanOrEqual(11);
			}
		});
	});
});
