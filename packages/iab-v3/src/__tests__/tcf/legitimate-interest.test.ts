/**
 * Legitimate Interest Tests for IAB TCF 2.3
 *
 * These tests verify correct behavior for legitimate interest handling:
 * - LI defaults to allowed (true) for vendors declaring LI
 * - User objection sets LI to false
 * - Purpose-level objection cascades to vendors
 * - Vendor-level objection is independent
 * - TC String correctly encodes LI objections
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GlobalVendorList, TCFConsentData } from '../../tcf/iab-tcf-types';
import { decodeTCString, generateTCString } from '../../tcf/tc-string';
import {
	assertTCStringHasLIObjection,
	createMockGVL,
	createMockGVLWithLIVendors,
	createMockLegitimateInterestState,
	createMockTCFConsent,
	createMockTCFConsentAllGranted,
	createMockVendor,
	simulateUserObjection,
} from './test-setup';

describe('Legitimate Interest Handling', () => {
	let mockGVL: GlobalVendorList;

	beforeEach(() => {
		mockGVL = createMockGVLWithLIVendors();
	});

	describe('LI Default State', () => {
		it('should default LI to allowed (true) for vendors declaring LI purposes', () => {
			const liState = createMockLegitimateInterestState();

			// All vendors should have LI allowed by default
			expect(liState.vendorLegitimateInterests[1]).toBe(true);
			expect(liState.vendorLegitimateInterests[2]).toBe(true);
			expect(liState.vendorLegitimateInterests[10]).toBe(true);
			expect(liState.vendorLegitimateInterests[755]).toBe(true);
		});

		it('should default purpose LI to allowed (true) for purposes 2-11', () => {
			const liState = createMockLegitimateInterestState();

			// Purpose 1 cannot have LI per TCF spec
			expect(liState.purposeLegitimateInterests[1]).toBeUndefined();

			// Purposes 2-11 should have LI allowed by default
			for (let i = 2; i <= 11; i++) {
				expect(liState.purposeLegitimateInterests[i]).toBe(true);
			}
		});

		it('should recognize vendors with legIntPurposes in GVL', () => {
			// Vendor 1 has legIntPurposes: [7, 8, 9]
			const vendor1 = mockGVL.vendors[1];
			expect(vendor1.legIntPurposes).toContain(7);
			expect(vendor1.legIntPurposes).toContain(8);
			expect(vendor1.legIntPurposes).toContain(9);

			// Vendor 10 has legIntPurposes: [2, 7, 9, 10]
			const vendor10 = mockGVL.vendors[10];
			expect(vendor10.legIntPurposes).toContain(2);
			expect(vendor10.legIntPurposes).toContain(7);
			expect(vendor10.legIntPurposes).toContain(9);
			expect(vendor10.legIntPurposes).toContain(10);
		});
	});

	describe('User Objection - Vendor Level', () => {
		it('should set vendor LI to false when user objects', () => {
			const initialState = createMockTCFConsentAllGranted();

			// User objects to vendor 10 LI
			const updatedState = simulateUserObjection(initialState, 10);

			// Vendor 10 LI should be false (objected)
			expect(updatedState.vendorLegitimateInterests[10]).toBe(false);

			// Other vendors should be unaffected
			expect(updatedState.vendorLegitimateInterests[1]).toBe(true);
			expect(updatedState.vendorLegitimateInterests[2]).toBe(true);
		});

		it('should allow objection to multiple vendors independently', () => {
			let state = createMockTCFConsentAllGranted();

			// Object to vendors 1 and 10
			state = simulateUserObjection(state, 1);
			state = simulateUserObjection(state, 10);

			expect(state.vendorLegitimateInterests[1]).toBe(false);
			expect(state.vendorLegitimateInterests[10]).toBe(false);
			expect(state.vendorLegitimateInterests[2]).toBe(true);
			expect(state.vendorLegitimateInterests[755]).toBe(true);
		});
	});

	describe('User Objection - Purpose Level', () => {
		it('should set purpose LI to false when user objects at purpose level', () => {
			const initialState = createMockTCFConsentAllGranted();

			// User objects to purpose 9 LI (affects all vendors using LI for purpose 9)
			const updatedState = simulateUserObjection(initialState, 1, 9);

			// Purpose 9 LI should be false (objected)
			expect(updatedState.purposeLegitimateInterests[9]).toBe(false);

			// Other purposes should be unaffected
			expect(updatedState.purposeLegitimateInterests[7]).toBe(true);
			expect(updatedState.purposeLegitimateInterests[10]).toBe(true);
		});

		it('should allow purpose-level objection independent of vendor-level', () => {
			const liState = createMockLegitimateInterestState({
				purposeObjections: { 9: true }, // Object to purpose 9
			});

			// Purpose 9 objected
			expect(liState.purposeLegitimateInterests[9]).toBe(false);

			// Vendors still have their individual LI status
			expect(liState.vendorLegitimateInterests[1]).toBe(true);
			expect(liState.vendorLegitimateInterests[10]).toBe(true);
		});
	});

	describe('TC String Encoding - LI Objections', () => {
		it('should encode vendor LI objection in TC String', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true, 2: true },
				purposeLegitimateInterests: { 7: true, 9: true, 10: true },
				vendorConsents: { 1: true, 10: true },
				vendorLegitimateInterests: {
					1: true,
					10: false, // Objected
				},
				specialFeatureOptIns: {},
				vendorsDisclosed: { 1: true, 10: true },
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Vendor 1 should have LI
			expect(decoded.vendorLegitimateInterests[1]).toBe(true);

			// Vendor 10 should NOT have LI (objected)
			expect(decoded.vendorLegitimateInterests[10]).toBeUndefined();
		});

		it('should encode purpose LI objection in TC String', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true },
				purposeLegitimateInterests: {
					7: true,
					9: false, // Objected
					10: true,
				},
				vendorConsents: { 1: true },
				vendorLegitimateInterests: { 1: true },
				specialFeatureOptIns: {},
				vendorsDisclosed: { 1: true },
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Purpose 7 and 10 should have LI
			expect(decoded.purposeLegitimateInterests[7]).toBe(true);
			expect(decoded.purposeLegitimateInterests[10]).toBe(true);

			// Purpose 9 should NOT have LI (objected)
			expect(decoded.purposeLegitimateInterests[9]).toBeUndefined();
		});

		it('should round-trip LI objections correctly', async () => {
			const consentData = createMockTCFConsentAllGranted();

			// Object to vendor 2 and purpose 8
			consentData.vendorLegitimateInterests[2] = false;
			consentData.purposeLegitimateInterests[8] = false;

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Vendor 2 LI objection should be preserved
			expect(decoded.vendorLegitimateInterests[2]).toBeUndefined();

			// Purpose 8 LI objection should be preserved
			expect(decoded.purposeLegitimateInterests[8]).toBeUndefined();

			// Other LIs should still be granted
			expect(decoded.vendorLegitimateInterests[1]).toBe(true);
			expect(decoded.purposeLegitimateInterests[7]).toBe(true);
		});
	});

	describe('LI Signal Behavior', () => {
		it('should reflect objection status immediately in state', () => {
			const state = createMockTCFConsentAllGranted();

			// Before objection
			expect(state.vendorLegitimateInterests[10]).toBe(true);

			// After objection
			const updated = simulateUserObjection(state, 10);
			expect(updated.vendorLegitimateInterests[10]).toBe(false);
		});

		it('vendor with LI objection cannot process under LI legal basis', async () => {
			// This test verifies the signal correctly indicates LI is not available
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true },
				purposeLegitimateInterests: { 9: true },
				vendorConsents: { 10: false }, // No consent
				vendorLegitimateInterests: { 10: false }, // No LI (objected)
				specialFeatureOptIns: {},
				vendorsDisclosed: { 10: true },
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Vendor 10 has neither consent nor LI
			expect(decoded.vendorConsents[10]).toBeUndefined();
			expect(decoded.vendorLegitimateInterests[10]).toBeUndefined();

			// Therefore vendor 10 cannot process data under any legal basis
		});
	});

	describe('Flexible Purposes', () => {
		it('should recognize vendors with flexible purposes', () => {
			// Vendor 1 has flexiblePurposes: [2] - can use either consent or LI
			const vendor1 = mockGVL.vendors[1];
			expect(vendor1.flexiblePurposes).toContain(2);

			// Vendor 755 has flexiblePurposes: [2, 7, 9, 10, 11]
			const vendor755 = mockGVL.vendors[755];
			expect(vendor755.flexiblePurposes).toContain(2);
			expect(vendor755.flexiblePurposes).toContain(7);
		});

		it('should allow vendor to operate under consent if LI is objected for flexible purpose', async () => {
			// For a flexible purpose, if user objects to LI, vendor can still use consent
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true, 2: true }, // Consent granted for purpose 2
				purposeLegitimateInterests: { 2: false }, // LI objected for purpose 2
				vendorConsents: { 1: true },
				vendorLegitimateInterests: { 1: false }, // Vendor 1 LI objected
				specialFeatureOptIns: {},
				vendorsDisclosed: { 1: true },
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Vendor 1 still has consent
			expect(decoded.vendorConsents[1]).toBe(true);

			// Purpose 2 has consent
			expect(decoded.purposeConsents[2]).toBe(true);

			// Vendor 1 and Purpose 2 LI are objected
			expect(decoded.vendorLegitimateInterests[1]).toBeUndefined();
			expect(decoded.purposeLegitimateInterests[2]).toBeUndefined();
		});
	});

	describe('LI State Factory', () => {
		it('should create state with no objections by default', () => {
			const state = createMockLegitimateInterestState();

			// All vendors should be allowed
			expect(
				Object.values(state.vendorLegitimateInterests).every((v) => v === true)
			).toBe(true);

			// All purposes should be allowed
			expect(
				Object.values(state.purposeLegitimateInterests).every((v) => v === true)
			).toBe(true);
		});

		it('should create state with vendor objections', () => {
			const state = createMockLegitimateInterestState({
				vendorObjections: { 1: true, 10: true },
			});

			expect(state.vendorLegitimateInterests[1]).toBe(false);
			expect(state.vendorLegitimateInterests[10]).toBe(false);
			expect(state.vendorLegitimateInterests[2]).toBe(true);
			expect(state.vendorLegitimateInterests[755]).toBe(true);
		});

		it('should create state with purpose objections', () => {
			const state = createMockLegitimateInterestState({
				purposeObjections: { 7: true, 9: true },
			});

			expect(state.purposeLegitimateInterests[7]).toBe(false);
			expect(state.purposeLegitimateInterests[9]).toBe(false);
			expect(state.purposeLegitimateInterests[8]).toBe(true);
			expect(state.purposeLegitimateInterests[10]).toBe(true);
		});

		it('should create state with both vendor and purpose objections', () => {
			const state = createMockLegitimateInterestState({
				vendorObjections: { 1: true },
				purposeObjections: { 9: true },
			});

			expect(state.vendorLegitimateInterests[1]).toBe(false);
			expect(state.vendorLegitimateInterests[2]).toBe(true);
			expect(state.purposeLegitimateInterests[9]).toBe(false);
			expect(state.purposeLegitimateInterests[10]).toBe(true);
		});
	});

	describe('TC String Assertion Helper', () => {
		it('should pass when vendor has LI objection', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true },
				purposeLegitimateInterests: { 9: true },
				vendorConsents: { 1: true },
				vendorLegitimateInterests: { 1: false }, // Objected
				specialFeatureOptIns: {},
				vendorsDisclosed: { 1: true },
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Should not throw - vendor 1 has LI objection
			expect(() => assertTCStringHasLIObjection(decoded, 1)).not.toThrow();
		});

		it('should fail when vendor has LI granted', async () => {
			const consentData: TCFConsentData = {
				purposeConsents: { 1: true },
				purposeLegitimateInterests: { 9: true },
				vendorConsents: { 1: true },
				vendorLegitimateInterests: { 1: true }, // Granted
				specialFeatureOptIns: {},
				vendorsDisclosed: { 1: true },
			};

			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			const decoded = await decodeTCString(tcString);

			// Should throw - vendor 1 has LI granted
			expect(() => assertTCStringHasLIObjection(decoded, 1)).toThrow(
				/Expected vendor 1 to have LI objection/
			);
		});
	});
});
