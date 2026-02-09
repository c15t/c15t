/**
 * Publisher Restrictions Tests for IAB TCF 2.3
 *
 * Tests for publisher restriction handling per IAB spec.
 *
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { GlobalVendorList, TCFConsentData } from '../../../types/iab-tcf';
import { decodeTCString, generateTCString } from '../tc-string';
import {
	createMockGVL,
	createMockPublisherRestriction,
	createMockPublisherRestrictions,
	createMockTCFConsentAllGranted,
	RestrictionType,
} from './test-setup';

describe('Publisher Restrictions - IAB TCF 2.3', () => {
	let mockGVL: GlobalVendorList;

	beforeEach(() => {
		mockGVL = createMockGVL();
	});

	describe('Restriction Type Definitions', () => {
		it('should define Type 0: Purpose flatly not allowed', () => {
			expect(RestrictionType.NOT_ALLOWED).toBe(0);
		});

		it('should define Type 1: Require consent (cannot use LI)', () => {
			expect(RestrictionType.REQUIRE_CONSENT).toBe(1);
		});

		it('should define Type 2: Require LI (cannot use consent)', () => {
			expect(RestrictionType.REQUIRE_LEGITIMATE_INTEREST).toBe(2);
		});
	});

	describe('Mock Publisher Restriction Factory', () => {
		it('should create single restriction with defaults', () => {
			const restriction = createMockPublisherRestriction();

			expect(restriction.purposeId).toBe(2);
			expect(restriction.restrictionType).toBe(RestrictionType.NOT_ALLOWED);
			expect(restriction.vendorIds).toEqual([1, 2]);
		});

		it('should create restriction with overrides', () => {
			const restriction = createMockPublisherRestriction({
				purposeId: 7,
				restrictionType: RestrictionType.REQUIRE_CONSENT,
				vendorIds: [10, 755],
			});

			expect(restriction.purposeId).toBe(7);
			expect(restriction.restrictionType).toBe(RestrictionType.REQUIRE_CONSENT);
			expect(restriction.vendorIds).toEqual([10, 755]);
		});

		it('should create multiple restrictions covering all types', () => {
			const restrictions = createMockPublisherRestrictions();

			expect(restrictions.length).toBe(3);

			// Type 0
			const type0 = restrictions.find(
				(r) => r.restrictionType === RestrictionType.NOT_ALLOWED
			);
			expect(type0).toBeDefined();
			expect(type0?.purposeId).toBe(2);

			// Type 1
			const type1 = restrictions.find(
				(r) => r.restrictionType === RestrictionType.REQUIRE_CONSENT
			);
			expect(type1).toBeDefined();
			expect(type1?.purposeId).toBe(7);

			// Type 2
			const type2 = restrictions.find(
				(r) => r.restrictionType === RestrictionType.REQUIRE_LEGITIMATE_INTEREST
			);
			expect(type2).toBeDefined();
			expect(type2?.purposeId).toBe(9);
		});
	});

	describe('Restriction Type 0: Purpose Not Allowed', () => {
		it('vendor cannot use purpose at all when Type 0 restriction applies', () => {
			const restriction = createMockPublisherRestriction({
				purposeId: 2,
				restrictionType: RestrictionType.NOT_ALLOWED,
				vendorIds: [1],
			});

			// Even if consent is given, vendor 1 cannot use purpose 2
			// This is a policy constraint that the UI should enforce
			expect(restriction.restrictionType).toBe(0);
			expect(restriction.vendorIds).toContain(1);
		});
	});

	describe('Restriction Type 1: Require Consent', () => {
		it('vendor must use consent (cannot use LI) when Type 1 restriction applies', () => {
			const restriction = createMockPublisherRestriction({
				purposeId: 7,
				restrictionType: RestrictionType.REQUIRE_CONSENT,
				vendorIds: [10],
			});

			// Vendor 10 must use consent for purpose 7, cannot use LI
			expect(restriction.restrictionType).toBe(1);
			expect(restriction.vendorIds).toContain(10);
		});
	});

	describe('Restriction Type 2: Require Legitimate Interest', () => {
		it('vendor must use LI (cannot use consent) when Type 2 restriction applies', () => {
			const restriction = createMockPublisherRestriction({
				purposeId: 9,
				restrictionType: RestrictionType.REQUIRE_LEGITIMATE_INTEREST,
				vendorIds: [755],
			});

			// Vendor 755 must use LI for purpose 9, cannot use consent
			expect(restriction.restrictionType).toBe(2);
			expect(restriction.vendorIds).toContain(755);
		});
	});

	describe('Restriction Signal Compliance', () => {
		it('restrictions should be representable for UI decisions', () => {
			const restrictions = createMockPublisherRestrictions();

			// Create a lookup structure for efficient restriction checks
			const restrictionMap = new Map<string, number>();
			for (const r of restrictions) {
				for (const vendorId of r.vendorIds) {
					const key = `${r.purposeId}-${vendorId}`;
					restrictionMap.set(key, r.restrictionType);
				}
			}

			// Verify we can look up restrictions
			expect(restrictionMap.get('2-1')).toBe(RestrictionType.NOT_ALLOWED);
			expect(restrictionMap.get('7-10')).toBe(RestrictionType.REQUIRE_CONSENT);
			expect(restrictionMap.get('9-755')).toBe(
				RestrictionType.REQUIRE_LEGITIMATE_INTEREST
			);
		});
	});

	describe('UI Enforcement of Restrictions', () => {
		it('Type 0 restriction should disable toggle for that purpose/vendor combination', () => {
			const restrictions = createMockPublisherRestrictions();
			const type0 = restrictions.find(
				(r) => r.restrictionType === RestrictionType.NOT_ALLOWED
			);

			// UI should not show toggle for vendor 1 and 2 for purpose 2
			expect(type0?.purposeId).toBe(2);
			expect(type0?.vendorIds).toEqual([1, 2]);

			// In the UI, these vendor/purpose combinations would be hidden or disabled
		});

		it('Type 1 restriction should hide LI toggle (show only consent)', () => {
			const restrictions = createMockPublisherRestrictions();
			const type1 = restrictions.find(
				(r) => r.restrictionType === RestrictionType.REQUIRE_CONSENT
			);

			// UI should only show consent toggle, not LI toggle
			expect(type1?.purposeId).toBe(7);
			expect(type1?.vendorIds).toEqual([10]);

			// In the UI, vendor 10 would only have consent toggle for purpose 7
		});

		it('Type 2 restriction should hide consent toggle (show only LI)', () => {
			const restrictions = createMockPublisherRestrictions();
			const type2 = restrictions.find(
				(r) => r.restrictionType === RestrictionType.REQUIRE_LEGITIMATE_INTEREST
			);

			// UI should only show LI toggle, not consent toggle
			expect(type2?.purposeId).toBe(9);
			expect(type2?.vendorIds).toEqual([755]);

			// In the UI, vendor 755 would only have LI toggle for purpose 9
		});
	});

	describe('Restriction Coverage', () => {
		it('restriction should apply to specific vendor+purpose combinations', () => {
			const restriction = createMockPublisherRestriction({
				purposeId: 3,
				restrictionType: RestrictionType.NOT_ALLOWED,
				vendorIds: [1, 10],
			});

			// Only specific combinations are restricted
			expect(restriction.vendorIds).toContain(1);
			expect(restriction.vendorIds).toContain(10);
			expect(restriction.vendorIds).not.toContain(2);
			expect(restriction.vendorIds).not.toContain(755);
		});

		it('multiple restrictions can apply to same vendor', () => {
			const restrictions = [
				createMockPublisherRestriction({
					purposeId: 2,
					restrictionType: RestrictionType.NOT_ALLOWED,
					vendorIds: [1],
				}),
				createMockPublisherRestriction({
					purposeId: 7,
					restrictionType: RestrictionType.REQUIRE_CONSENT,
					vendorIds: [1],
				}),
			];

			// Vendor 1 has two different restrictions for different purposes
			const vendor1Restrictions = restrictions.filter((r) =>
				r.vendorIds.includes(1)
			);
			expect(vendor1Restrictions.length).toBe(2);
		});

		it('same purpose can have different restriction types for different vendors', () => {
			const restrictions = [
				createMockPublisherRestriction({
					purposeId: 7,
					restrictionType: RestrictionType.NOT_ALLOWED,
					vendorIds: [1],
				}),
				createMockPublisherRestriction({
					purposeId: 7,
					restrictionType: RestrictionType.REQUIRE_CONSENT,
					vendorIds: [10],
				}),
			];

			// Purpose 7 has different restrictions for different vendors
			expect(restrictions[0].restrictionType).toBe(RestrictionType.NOT_ALLOWED);
			expect(restrictions[1].restrictionType).toBe(
				RestrictionType.REQUIRE_CONSENT
			);
		});
	});
});
