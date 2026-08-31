/**
 * Tests for IAB purpose to c15t consent mapping.
 */

import { describe, expect, it } from 'vitest';

import {
	C15T_TO_IAB_PURPOSE_MAP,
	c15tConsentsToIabPurposes,
	c15tToIabPurposes,
	categorizeVendorPurposes,
	IAB_PURPOSE_TO_C15T_MAP,
	iabPurposesToC15tConsents,
	iabPurposeToC15t,
	vendorHasRequiredConsents,
} from '../../tcf/purpose-mapping';

describe('IAB Purpose to c15t Mapping', () => {
	describe('IAB_PURPOSE_TO_C15T_MAP', () => {
		it('should map all 11 IAB purposes', () => {
			expect(Object.keys(IAB_PURPOSE_TO_C15T_MAP)).toHaveLength(11);
		});

		it('should map purpose 1 to necessary', () => {
			expect(IAB_PURPOSE_TO_C15T_MAP[1]).toBe('necessary');
		});

		it('should map purposes 2-4 to marketing', () => {
			expect(IAB_PURPOSE_TO_C15T_MAP[2]).toBe('marketing');
			expect(IAB_PURPOSE_TO_C15T_MAP[3]).toBe('marketing');
			expect(IAB_PURPOSE_TO_C15T_MAP[4]).toBe('marketing');
		});

		it('should map purposes 5-6 to experience', () => {
			expect(IAB_PURPOSE_TO_C15T_MAP[5]).toBe('experience');
			expect(IAB_PURPOSE_TO_C15T_MAP[6]).toBe('experience');
		});

		it('should map purposes 7-9 to measurement', () => {
			expect(IAB_PURPOSE_TO_C15T_MAP[7]).toBe('measurement');
			expect(IAB_PURPOSE_TO_C15T_MAP[8]).toBe('measurement');
			expect(IAB_PURPOSE_TO_C15T_MAP[9]).toBe('measurement');
		});

		it('should map purposes 10-11 to functionality', () => {
			expect(IAB_PURPOSE_TO_C15T_MAP[10]).toBe('functionality');
			expect(IAB_PURPOSE_TO_C15T_MAP[11]).toBe('functionality');
		});
	});

	describe('C15T_TO_IAB_PURPOSE_MAP', () => {
		it('should have all 5 c15t categories', () => {
			expect(Object.keys(C15T_TO_IAB_PURPOSE_MAP)).toHaveLength(5);
		});

		it('should map necessary to purpose 1', () => {
			expect(C15T_TO_IAB_PURPOSE_MAP.necessary).toEqual([1]);
		});

		it('should map marketing to purposes 2, 3, 4', () => {
			expect(C15T_TO_IAB_PURPOSE_MAP.marketing).toEqual([2, 3, 4]);
		});

		it('should map experience to purposes 5, 6', () => {
			expect(C15T_TO_IAB_PURPOSE_MAP.experience).toEqual([5, 6]);
		});

		it('should map measurement to purposes 7, 8, 9', () => {
			expect(C15T_TO_IAB_PURPOSE_MAP.measurement).toEqual([7, 8, 9]);
		});

		it('should map functionality to purposes 10, 11', () => {
			expect(C15T_TO_IAB_PURPOSE_MAP.functionality).toEqual([10, 11]);
		});
	});

	describe('iabPurposeToC15t', () => {
		it('should convert valid purpose IDs', () => {
			expect(iabPurposeToC15t(1)).toBe('necessary');
			expect(iabPurposeToC15t(2)).toBe('marketing');
			expect(iabPurposeToC15t(7)).toBe('measurement');
		});

		it('should return null for invalid purpose IDs', () => {
			expect(iabPurposeToC15t(0)).toBeNull();
			expect(iabPurposeToC15t(12)).toBeNull();
			expect(iabPurposeToC15t(99)).toBeNull();
		});
	});

	describe('c15tToIabPurposes', () => {
		it('should convert valid c15t categories', () => {
			expect(c15tToIabPurposes('necessary')).toEqual([1]);
			expect(c15tToIabPurposes('marketing')).toEqual([2, 3, 4]);
			expect(c15tToIabPurposes('measurement')).toEqual([7, 8, 9]);
		});

		it('should return empty array for invalid categories', () => {
			// @ts-expect-error Testing invalid input
			expect(c15tToIabPurposes('invalid')).toEqual([]);
		});
	});

	describe('c15tConsentsToIabPurposes', () => {
		it('should convert c15t consent state to IAB purposes', () => {
			const c15tConsents = {
				experience: true,
				functionality: false,
				marketing: false,
				measurement: true,
				necessary: true,
			};

			const result = c15tConsentsToIabPurposes(c15tConsents);

			// Necessary purposes
			expect(result[1]).toBe(true);

			// Marketing purposes
			expect(result[2]).toBe(false);
			expect(result[3]).toBe(false);
			expect(result[4]).toBe(false);

			// Experience purposes
			expect(result[5]).toBe(true);
			expect(result[6]).toBe(true);

			// Measurement purposes
			expect(result[7]).toBe(true);
			expect(result[8]).toBe(true);
			expect(result[9]).toBe(true);

			// Functionality purposes
			expect(result[10]).toBe(false);
			expect(result[11]).toBe(false);
		});

		it('should handle all true consents', () => {
			const c15tConsents = {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			};

			const result = c15tConsentsToIabPurposes(c15tConsents);

			for (let i = 1; i <= 11; i += 1) {
				expect(result[i]).toBe(true);
			}
		});

		it('should handle all false consents', () => {
			const c15tConsents = {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: false,
			};

			const result = c15tConsentsToIabPurposes(c15tConsents);

			for (let i = 1; i <= 11; i += 1) {
				expect(result[i]).toBe(false);
			}
		});
	});

	describe('iabPurposesToC15tConsents', () => {
		it('should convert IAB purposes to c15t consents', () => {
			const purposeConsents = {
				1: true,
				10: true,
				11: true,
				2: true,
				3: true,
				4: true,
				5: false,
				6: false,
				7: true,
				8: true,
				9: true,
			};

			const result = iabPurposesToC15tConsents(purposeConsents);

			expect(result.necessary).toBe(true);
			expect(result.marketing).toBe(true);
			// 5 and 6 are false
			expect(result.experience).toBe(false);
			expect(result.measurement).toBe(true);
			expect(result.functionality).toBe(true);
		});

		it('should require ALL purposes in a category to be consented', () => {
			const purposeConsents = {
				1: true,
				10: true,
				11: true,
				2: true,
				3: true,
				// One marketing purpose not consented
				4: false,
				5: true,
				6: true,
				7: true,
				8: true,
				9: true,
			};

			const result = iabPurposesToC15tConsents(purposeConsents);

			// Not all marketing purposes consented
			expect(result.marketing).toBe(false);
		});

		it('should handle missing purposes as false', () => {
			const purposeConsents = {
				1: true,
				// Missing purposes 2-11
			};

			const result = iabPurposesToC15tConsents(purposeConsents);

			expect(result.necessary).toBe(true);
			expect(result.marketing).toBe(false);
			expect(result.experience).toBe(false);
			expect(result.measurement).toBe(false);
			expect(result.functionality).toBe(false);
		});
	});

	describe('categorizeVendorPurposes', () => {
		it('should categorize vendor purposes correctly', () => {
			const vendorPurposes = [1, 2, 7];
			const vendorLegIntPurposes = [9, 10];

			const result = categorizeVendorPurposes(
				vendorPurposes,
				vendorLegIntPurposes
			);

			expect(result.consentRequired).toEqual([1, 2, 7]);
			expect(result.legitInterest).toEqual([9, 10]);
			expect(result.all).toEqual([1, 2, 7, 9, 10]);
		});

		it('should handle empty arrays', () => {
			const result = categorizeVendorPurposes([], []);

			expect(result.consentRequired).toEqual([]);
			expect(result.legitInterest).toEqual([]);
			expect(result.all).toEqual([]);
		});

		it('should deduplicate overlapping purposes', () => {
			const vendorPurposes = [1, 2, 7];
			// 7 appears in both
			const vendorLegIntPurposes = [7, 9];

			const result = categorizeVendorPurposes(
				vendorPurposes,
				vendorLegIntPurposes
			);

			// 7 appears only once
			expect(result.all).toEqual([1, 2, 7, 9]);
		});
	});

	describe('vendorHasRequiredConsents', () => {
		it('should return true when all required consents are present', () => {
			const vendorPurposes = [1, 2, 7];
			const vendorLegIntPurposes = [9, 10];
			const purposeConsents = { 1: true, 2: true, 7: true };
			const purposeLegitInterests = { 10: true, 9: true };

			const result = vendorHasRequiredConsents(
				vendorPurposes,
				vendorLegIntPurposes,
				purposeConsents,
				purposeLegitInterests
			);

			expect(result).toBe(true);
		});

		it('should return false when a consent purpose is missing', () => {
			const vendorPurposes = [1, 2, 7];
			const vendorLegIntPurposes = [9, 10];
			// 7 not consented
			const purposeConsents = { 1: true, 2: true, 7: false };
			const purposeLegitInterests = { 10: true, 9: true };

			const result = vendorHasRequiredConsents(
				vendorPurposes,
				vendorLegIntPurposes,
				purposeConsents,
				purposeLegitInterests
			);

			expect(result).toBe(false);
		});

		it('should return false when a legit interest purpose is missing', () => {
			const vendorPurposes = [1, 2, 7];
			const vendorLegIntPurposes = [9, 10];
			const purposeConsents = { 1: true, 2: true, 7: true };
			// 10 not established
			const purposeLegitInterests = { 10: false, 9: true };

			const result = vendorHasRequiredConsents(
				vendorPurposes,
				vendorLegIntPurposes,
				purposeConsents,
				purposeLegitInterests
			);

			expect(result).toBe(false);
		});

		it('should return true for vendor with no requirements', () => {
			const result = vendorHasRequiredConsents([], [], {}, {});
			expect(result).toBe(true);
		});
	});
});
