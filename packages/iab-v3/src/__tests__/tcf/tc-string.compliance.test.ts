/**
 * TC String Compliance Tests for IAB TCF 2.3
 *
 * Tests for TC String encoding and decoding compliance.
 *
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { GlobalVendorList, TCFConsentData } from '../../tcf/iab-tcf-types';
import {
	decodeTCString,
	generateTCString,
	isValidTCStringFormat,
} from '../../tcf/tc-string';
import { INVALID_TC_STRING, MINIMAL_TC_STRING } from './fixtures/tc-strings';
import {
	createMockGVL,
	createMockGVLWithLIVendors,
	createMockTCFConsent,
	createMockTCFConsentAllGranted,
} from './test-setup';

describe('TC String Compliance - IAB TCF 2.3', () => {
	let mockGVL: GlobalVendorList;

	beforeEach(() => {
		mockGVL = createMockGVL();
	});

	describe('TC String Format Validation', () => {
		it('should validate correct TC String format', () => {
			expect(isValidTCStringFormat(MINIMAL_TC_STRING)).toBe(true);
		});

		it('should validate base64url encoded strings', () => {
			// Valid base64url characters: A-Z, a-z, 0-9, -, _
			expect(
				isValidTCStringFormat('CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA')
			).toBe(true);
			expect(
				isValidTCStringFormat('COtybn4PA_zT4KjACBENAPCIAEBAAECAAIAAAAAAAAAA')
			).toBe(true);
		});

		it('should reject empty string', () => {
			expect(isValidTCStringFormat('')).toBe(false);
		});

		it('should reject invalid characters', () => {
			expect(isValidTCStringFormat('not-valid!')).toBe(false);
			expect(isValidTCStringFormat('test@string')).toBe(false);
			expect(isValidTCStringFormat('has spaces')).toBe(false);
		});

		it('should reject strings that are too short', () => {
			expect(isValidTCStringFormat('short')).toBe(false);
			expect(isValidTCStringFormat('abc')).toBe(false);
		});

		it('should reject null/undefined/non-string', () => {
			// @ts-expect-error Testing invalid input
			expect(isValidTCStringFormat(null)).toBe(false);
			// @ts-expect-error Testing invalid input
			expect(isValidTCStringFormat(undefined)).toBe(false);
			// @ts-expect-error Testing invalid input
			expect(isValidTCStringFormat(123)).toBe(false);
			// @ts-expect-error Testing invalid input
			expect(isValidTCStringFormat({})).toBe(false);
		});
	});

	describe('TC String Encoding', () => {
		it('should generate valid TC String from consent data', async () => {
			const consentData = createMockTCFConsentAllGranted();

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			expect(tcString).toBeDefined();
			expect(typeof tcString).toBe('string');
			expect(tcString.length).toBeGreaterThan(10);
			// TC String may contain segment separators (.)
			// Validate each segment is valid base64url
			const segments = tcString.split('.');
			for (const segment of segments) {
				expect(isValidTCStringFormat(segment)).toBe(true);
			}
		});

		it('should encode all 11 purposes correctly', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: {
					1: true,
					2: true,
					3: false,
					4: true,
					5: false,
					6: true,
					7: true,
					8: false,
					9: true,
					10: false,
					11: true,
				},
				purposeLegitimateInterests: {},
				vendorConsents: { 1: true },
				vendorLegitimateInterests: {},
				specialFeatureOptIns: {},
				vendorsDisclosed: { 1: true },
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Verify purpose consents
			expect(decoded.purposeConsents[1]).toBe(true);
			expect(decoded.purposeConsents[2]).toBe(true);
			expect(decoded.purposeConsents[3]).toBeUndefined();
			expect(decoded.purposeConsents[4]).toBe(true);
			expect(decoded.purposeConsents[5]).toBeUndefined();
			expect(decoded.purposeConsents[6]).toBe(true);
			expect(decoded.purposeConsents[7]).toBe(true);
			expect(decoded.purposeConsents[8]).toBeUndefined();
			expect(decoded.purposeConsents[9]).toBe(true);
			expect(decoded.purposeConsents[10]).toBeUndefined();
			expect(decoded.purposeConsents[11]).toBe(true);
		});

		it('should encode purpose LI for purposes 2-11 (not Purpose 1)', async () => {
			// Use GVL with vendors that have LI for purposes 2, 7, 8, 9, 10
			const liGVL = createMockGVLWithLIVendors();

			const consentData: TCFConsentData = {
				purposeConsents: { 1: true },
				purposeLegitimateInterests: {
					// Purpose 1 cannot have LI per TCF spec
					// Only set LI for purposes that GVL vendors support
					2: true,
					7: true,
					8: true,
					9: true,
					10: true,
				},
				vendorConsents: { 1: true },
				vendorLegitimateInterests: { 1: true },
				specialFeatureOptIns: {},
				vendorsDisclosed: { 1: true },
			};

			const tcString = await generateTCString(consentData, liGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Purpose 1 should not have LI
			expect(decoded.purposeLegitimateInterests[1]).toBeUndefined();

			// Purposes 2-11 can have LI (these are supported by GVL vendors)
			expect(decoded.purposeLegitimateInterests[2]).toBe(true);
			expect(decoded.purposeLegitimateInterests[7]).toBe(true);
			expect(decoded.purposeLegitimateInterests[8]).toBe(true);
			expect(decoded.purposeLegitimateInterests[9]).toBe(true);
			expect(decoded.purposeLegitimateInterests[10]).toBe(true);
		});

		it('should encode vendor consents correctly', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true },
				purposeLegitimateInterests: {},
				vendorConsents: {
					1: true,
					2: true,
					10: false,
					755: true,
				},
				vendorLegitimateInterests: {},
				specialFeatureOptIns: {},
				vendorsDisclosed: { 1: true, 2: true, 10: true, 755: true },
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			expect(decoded.vendorConsents[1]).toBe(true);
			expect(decoded.vendorConsents[2]).toBe(true);
			expect(decoded.vendorConsents[10]).toBeUndefined();
			expect(decoded.vendorConsents[755]).toBe(true);
		});

		it('should encode vendor LI correctly', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true },
				purposeLegitimateInterests: { 9: true },
				vendorConsents: { 1: true },
				vendorLegitimateInterests: {
					1: true,
					2: false,
					10: true,
				},
				specialFeatureOptIns: {},
				vendorsDisclosed: { 1: true, 2: true, 10: true },
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			expect(decoded.vendorLegitimateInterests[1]).toBe(true);
			expect(decoded.vendorLegitimateInterests[2]).toBeUndefined();
			expect(decoded.vendorLegitimateInterests[10]).toBe(true);
		});

		it('should encode special feature opt-ins (1-2)', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true },
				purposeLegitimateInterests: {},
				vendorConsents: { 1: true },
				vendorLegitimateInterests: {},
				specialFeatureOptIns: {
					1: true,
					2: false,
				},
				vendorsDisclosed: { 1: true },
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			expect(decoded.specialFeatureOptIns[1]).toBe(true);
			expect(decoded.specialFeatureOptIns[2]).toBeUndefined();
		});

		it('should encode vendorsDisclosed (TCF 2.3 requirement)', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true },
				purposeLegitimateInterests: {},
				vendorConsents: { 1: true },
				vendorLegitimateInterests: {},
				specialFeatureOptIns: {},
				vendorsDisclosed: {
					1: true,
					2: true,
					10: true,
					755: true,
				},
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			expect(decoded.vendorsDisclosed[1]).toBe(true);
			expect(decoded.vendorsDisclosed[2]).toBe(true);
			expect(decoded.vendorsDisclosed[10]).toBe(true);
			expect(decoded.vendorsDisclosed[755]).toBe(true);
		});
	});

	describe('TC String Decoding', () => {
		it('should decode valid TC String', async () => {
			const consentData = createMockTCFConsentAllGranted();
			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			expect(decoded).toBeDefined();
			expect(decoded.cmpId).toBe(28);
			expect(decoded.cmpVersion).toBe(1);
		});

		it('should decode CMP metadata correctly', async () => {
			const consentData = createMockTCFConsentAllGranted();
			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 160,
				cmpVersion: 2,
				consentLanguage: 'EN',
				publisherCountryCode: 'GB',
			});

			const decoded = await decodeTCString(tcString);

			expect(decoded.cmpId).toBe(160);
			expect(decoded.cmpVersion).toBe(2);
			expect(decoded.consentLanguage).toBe('EN');
		});

		it('should decode isServiceSpecific correctly', async () => {
			const consentData = createMockTCFConsentAllGranted();

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
				isServiceSpecific: true,
			});

			const decoded = await decodeTCString(tcString);

			// Per TCF spec: global scope is invalid since Sept 2021
			expect(decoded.isServiceSpecific).toBe(true);
		});

		it('should decode timestamps correctly', async () => {
			const consentData = createMockTCFConsentAllGranted();

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Created and lastUpdated should be Date instances
			expect(decoded.created).toBeInstanceOf(Date);
			expect(decoded.lastUpdated).toBeInstanceOf(Date);

			// TC String timestamps have decisecond (100ms) precision and may be
			// rounded/truncated by the library. Just verify they are valid dates
			// and lastUpdated >= created
			expect(decoded.created.getTime()).toBeGreaterThan(0);
			expect(decoded.lastUpdated.getTime()).toBeGreaterThanOrEqual(
				decoded.created.getTime()
			);

			// Timestamp should be within the last 24 hours (allowing for library rounding)
			const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
			const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
			expect(decoded.created.getTime()).toBeGreaterThanOrEqual(oneDayAgo);
			expect(decoded.created.getTime()).toBeLessThanOrEqual(oneDayFromNow);
		});

		it('should decode vendorListVersion correctly', async () => {
			const consentData = createMockTCFConsentAllGranted();
			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			expect(decoded.vendorListVersion).toBe(mockGVL.vendorListVersion);
		});

		it('should decode policyVersion correctly', async () => {
			const consentData = createMockTCFConsentAllGranted();
			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// TCF 2.3 uses policy version 5
			expect(decoded.policyVersion).toBe(5);
		});
	});

	describe('TC String Round-Trip', () => {
		it('should preserve all consent data in round-trip', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: {
					1: true,
					2: true,
					3: true,
					4: false,
					5: true,
					6: false,
					7: true,
					8: true,
					9: false,
					10: true,
					11: true,
				},
				purposeLegitimateInterests: {
					2: true,
					7: true,
					9: true,
				},
				vendorConsents: {
					1: true,
					2: true,
					10: true,
					755: true,
				},
				vendorLegitimateInterests: {
					1: true,
					10: true,
				},
				specialFeatureOptIns: {
					1: true,
					2: true,
				},
				vendorsDisclosed: {
					1: true,
					2: true,
					10: true,
					755: true,
				},
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Verify purpose consents
			expect(decoded.purposeConsents[1]).toBe(true);
			expect(decoded.purposeConsents[2]).toBe(true);
			expect(decoded.purposeConsents[3]).toBe(true);
			expect(decoded.purposeConsents[5]).toBe(true);
			expect(decoded.purposeConsents[7]).toBe(true);
			expect(decoded.purposeConsents[8]).toBe(true);
			expect(decoded.purposeConsents[10]).toBe(true);
			expect(decoded.purposeConsents[11]).toBe(true);

			// Verify purpose LI
			expect(decoded.purposeLegitimateInterests[2]).toBe(true);
			expect(decoded.purposeLegitimateInterests[7]).toBe(true);
			expect(decoded.purposeLegitimateInterests[9]).toBe(true);

			// Verify vendor consents
			expect(decoded.vendorConsents[1]).toBe(true);
			expect(decoded.vendorConsents[2]).toBe(true);
			expect(decoded.vendorConsents[10]).toBe(true);
			expect(decoded.vendorConsents[755]).toBe(true);

			// Verify vendor LI
			expect(decoded.vendorLegitimateInterests[1]).toBe(true);
			expect(decoded.vendorLegitimateInterests[10]).toBe(true);

			// Verify special feature opt-ins
			expect(decoded.specialFeatureOptIns[1]).toBe(true);
			expect(decoded.specialFeatureOptIns[2]).toBe(true);

			// Verify vendors disclosed
			expect(decoded.vendorsDisclosed[1]).toBe(true);
			expect(decoded.vendorsDisclosed[2]).toBe(true);
			expect(decoded.vendorsDisclosed[10]).toBe(true);
			expect(decoded.vendorsDisclosed[755]).toBe(true);
		});
	});

	describe('Service-Specific Scope', () => {
		it('should encode isServiceSpecific=true by default', async () => {
			const consentData = createMockTCFConsentAllGranted();
			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);
			expect(decoded.isServiceSpecific).toBe(true);
		});

		it('should allow explicit isServiceSpecific=true', async () => {
			const consentData = createMockTCFConsentAllGranted();
			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
				isServiceSpecific: true,
			});

			const decoded = await decodeTCString(tcString);
			expect(decoded.isServiceSpecific).toBe(true);
		});
	});

	describe('Empty Consent Data', () => {
		it('should handle empty consent data', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: {},
				purposeLegitimateInterests: {},
				vendorConsents: {},
				vendorLegitimateInterests: {},
				specialFeatureOptIns: {},
				vendorsDisclosed: {},
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			expect(tcString).toBeDefined();
			expect(typeof tcString).toBe('string');
			expect(tcString.length).toBeGreaterThan(10);

			// TC String may contain segment separators (.)
			// Each segment should be valid base64url (allowing shorter segments)
			const base64urlRegex = /^[A-Za-z0-9_-]+$/;
			const segments = tcString.split('.');
			for (const segment of segments) {
				expect(segment.length).toBeGreaterThan(0);
				expect(base64urlRegex.test(segment)).toBe(true);
			}

			// The true test of validity is that it can be decoded
			const decoded = await decodeTCString(tcString);
			expect(Object.keys(decoded.purposeConsents).length).toBe(0);
			expect(Object.keys(decoded.vendorConsents).length).toBe(0);
		});

		it('should handle empty vendorsDisclosed', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true },
				purposeLegitimateInterests: {},
				vendorConsents: { 1: true },
				vendorLegitimateInterests: {},
				specialFeatureOptIns: {},
				vendorsDisclosed: {},
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);
			expect(Object.keys(decoded.vendorsDisclosed).length).toBe(0);
		});
	});
});
