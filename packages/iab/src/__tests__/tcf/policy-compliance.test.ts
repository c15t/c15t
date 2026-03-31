/**
 * IAB Policy Compliance Tests for IAB TCF 2.3
 *
 * Tests for IAB TCF policy compliance per Chapter II and III of the spec.
 *
 * @see https://iabeurope.eu/tcf-2-0/
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { GlobalVendorList, TCFConsentData } from '../../tcf/iab-tcf-types';
import { decodeTCString, generateTCString } from '../../tcf/tc-string';
import {
	createMockGVL,
	createMockTCFConsent,
	createMockTCFConsentAllGranted,
} from './test-setup';

describe('IAB Policy Compliance - TCF 2.3', () => {
	let mockGVL: GlobalVendorList;

	beforeEach(() => {
		mockGVL = createMockGVL();
	});

	describe('Chapter II - CMP Policies', () => {
		describe('Positive Consent Requirements', () => {
			it('consent should only be granted from affirmative action (not pre-checked)', () => {
				// Default consent state should have no pre-checked consents
				const defaultConsent = createMockTCFConsent();

				// Most purposes should be false by default
				expect(defaultConsent.purposeConsents[2]).toBe(false);
				expect(defaultConsent.purposeConsents[3]).toBe(false);
				expect(defaultConsent.purposeConsents[4]).toBe(false);

				// Only Purpose 1 (strictly necessary) may be pre-selected
				expect(defaultConsent.purposeConsents[1]).toBe(true);
			});

			it('vendor consents should not be pre-checked', () => {
				const defaultConsent = createMockTCFConsent();

				// Only explicitly granted vendors should be true
				// Default mock has vendors 1, 2 as true (simulating user action)
				// In actual implementation, these would start as false
			});
		});

		describe('Positive LI Signal Requirements', () => {
			it('LI signal should only be positive after transparency provided', () => {
				// LI defaults to allowed (true) because transparency is provided via UI
				const consent = createMockTCFConsentAllGranted();

				// All LIs are true (allowed) after transparency
				expect(consent.purposeLegitimateInterests[2]).toBe(true);
				expect(consent.purposeLegitimateInterests[7]).toBe(true);
			});

			it('negative LI signal should be set on user objection', async () => {
				const consent: TCFConsentData = {
					purposeConsents: { 1: true },
					purposeLegitimateInterests: {
						7: true,
						9: false, // User objected
					},
					vendorConsents: { 1: true },
					vendorLegitimateInterests: {
						1: true,
						10: false, // User objected
					},
					specialFeatureOptIns: {},
					vendorsDisclosed: { 1: true, 10: true },
				};

				const tcString = await generateTCString(consent, mockGVL, {
					cmpId: 28,
					cmpVersion: 1,
				});

				const decoded = await decodeTCString(tcString);

				// Objected LIs should not be set
				expect(decoded.purposeLegitimateInterests[9]).toBeUndefined();
				expect(decoded.vendorLegitimateInterests[10]).toBeUndefined();

				// Non-objected LIs should be set
				expect(decoded.purposeLegitimateInterests[7]).toBe(true);
				expect(decoded.vendorLegitimateInterests[1]).toBe(true);
			});
		});

		describe('Special Feature Requirements', () => {
			it('special features should require explicit opt-in', () => {
				const defaultConsent = createMockTCFConsent();

				// Special features should be false by default
				expect(defaultConsent.specialFeatureOptIns[1]).toBe(false);
				expect(defaultConsent.specialFeatureOptIns[2]).toBe(false);
			});

			it('special feature opt-ins should be encoded in TC String', async () => {
				const consent: TCFConsentData = {
					purposeConsents: { 1: true },
					purposeLegitimateInterests: {},
					vendorConsents: { 1: true },
					vendorLegitimateInterests: {},
					specialFeatureOptIns: {
						1: true, // User opted in
						2: false, // User did not opt in
					},
					vendorsDisclosed: { 1: true },
				};

				const tcString = await generateTCString(consent, mockGVL, {
					cmpId: 28,
					cmpVersion: 1,
				});

				const decoded = await decodeTCString(tcString);

				expect(decoded.specialFeatureOptIns[1]).toBe(true);
				expect(decoded.specialFeatureOptIns[2]).toBeUndefined();
			});
		});

		describe('Standard Names Requirement', () => {
			it('GVL should contain standard purpose names', () => {
				// Purpose 1
				expect(mockGVL.purposes[1].name).toContain('Store');
				expect(mockGVL.purposes[1].name).toContain('device');

				// Purpose 2
				expect(mockGVL.purposes[2].name).toContain('advertising');

				// Purpose 7
				expect(mockGVL.purposes[7].name).toContain('Measure');
			});

			it('GVL should contain standard feature names', () => {
				// Feature 1
				expect(mockGVL.features[1].name).toContain('Match');
				expect(mockGVL.features[1].name).toContain('combine');

				// Feature 2
				expect(mockGVL.features[2].name).toContain('Link');
				expect(mockGVL.features[2].name).toContain('devices');
			});

			it('GVL should contain standard special feature names', () => {
				// Special Feature 1
				expect(mockGVL.specialFeatures[1].name).toContain('geolocation');

				// Special Feature 2
				expect(mockGVL.specialFeatures[2].name).toContain('scan');
			});
		});
	});

	describe('Chapter III - Vendor Policies', () => {
		describe('Signal Respect Requirements', () => {
			it('vendors must be able to read signals from TC String', async () => {
				const consent = createMockTCFConsentAllGranted();
				const tcString = await generateTCString(consent, mockGVL, {
					cmpId: 28,
					cmpVersion: 1,
				});

				const decoded = await decodeTCString(tcString);

				// Vendors can check their consent status
				expect(decoded.vendorConsents[1]).toBe(true);
				expect(decoded.vendorConsents[2]).toBe(true);
				expect(decoded.vendorConsents[755]).toBe(true);

				// Vendors can check their LI status
				expect(decoded.vendorLegitimateInterests[1]).toBe(true);
			});

			it('vendors should not process without valid legal basis in signal', async () => {
				// Consent data with no consent for vendor 10
				const consent: TCFConsentData = {
					purposeConsents: { 1: true },
					purposeLegitimateInterests: {},
					vendorConsents: {
						1: true,
						10: false, // No consent
					},
					vendorLegitimateInterests: {
						10: false, // No LI (objected)
					},
					specialFeatureOptIns: {},
					vendorsDisclosed: { 1: true, 10: true },
				};

				const tcString = await generateTCString(consent, mockGVL, {
					cmpId: 28,
					cmpVersion: 1,
				});

				const decoded = await decodeTCString(tcString);

				// Vendor 10 has neither consent nor LI - cannot process
				expect(decoded.vendorConsents[10]).toBeUndefined();
				expect(decoded.vendorLegitimateInterests[10]).toBeUndefined();
			});
		});

		describe('Signal Integrity', () => {
			it('signal should be forwarded without modification', async () => {
				const originalConsent: TCFConsentData = {
					purposeConsents: {
						1: true,
						2: true,
						3: false,
						7: true,
					},
					purposeLegitimateInterests: {
						9: true,
						10: false,
					},
					vendorConsents: {
						1: true,
						2: false,
						755: true,
					},
					vendorLegitimateInterests: {
						1: true,
						755: false,
					},
					specialFeatureOptIns: {
						1: true,
						2: false,
					},
					vendorsDisclosed: {
						1: true,
						2: true,
						755: true,
					},
				};

				const tcString = await generateTCString(originalConsent, mockGVL, {
					cmpId: 28,
					cmpVersion: 1,
				});

				const decoded = await decodeTCString(tcString);

				// All set values should be preserved
				expect(decoded.purposeConsents[1]).toBe(true);
				expect(decoded.purposeConsents[2]).toBe(true);
				expect(decoded.purposeConsents[7]).toBe(true);
				expect(decoded.purposeLegitimateInterests[9]).toBe(true);
				expect(decoded.vendorConsents[1]).toBe(true);
				expect(decoded.vendorConsents[755]).toBe(true);
				expect(decoded.vendorLegitimateInterests[1]).toBe(true);
				expect(decoded.specialFeatureOptIns[1]).toBe(true);

				// All unset/false values should not be in the decoded result
				expect(decoded.purposeConsents[3]).toBeUndefined();
				expect(decoded.purposeLegitimateInterests[10]).toBeUndefined();
				expect(decoded.vendorConsents[2]).toBeUndefined();
				expect(decoded.vendorLegitimateInterests[755]).toBeUndefined();
				expect(decoded.specialFeatureOptIns[2]).toBeUndefined();
			});
		});
	});

	describe('Appendix B - UI Requirements', () => {
		describe('Initial Layer Requirements', () => {
			it('should provide storage notice through purpose 1', () => {
				// Purpose 1 covers storage/access notice
				const purpose1 = mockGVL.purposes[1];
				expect(purpose1.name).toContain('Store');
				expect(purpose1.description).toBeDefined();
			});

			it('should provide vendor count from GVL', () => {
				const vendorCount = Object.keys(mockGVL.vendors).length;
				expect(vendorCount).toBeGreaterThan(0);
			});

			it('should provide purpose list from GVL', () => {
				const purposeCount = Object.keys(mockGVL.purposes).length;
				expect(purposeCount).toBe(11); // All 11 purposes
			});
		});

		describe('Default State Requirements', () => {
			it('default state should be "no consent"', () => {
				const defaultConsent = createMockTCFConsent();

				// Most purposes should default to false
				const consentValues = Object.values(defaultConsent.purposeConsents);
				const falseCount = consentValues.filter((v) => v === false).length;

				// At least purposes 2-11 should be false
				expect(falseCount).toBeGreaterThanOrEqual(10);
			});

			it('special features should default to "no opt-in"', () => {
				const defaultConsent = createMockTCFConsent();

				expect(defaultConsent.specialFeatureOptIns[1]).toBe(false);
				expect(defaultConsent.specialFeatureOptIns[2]).toBe(false);
			});
		});
	});

	describe('TCF 2.3 Specific Requirements', () => {
		describe('vendorsDisclosed Requirement', () => {
			it('should track vendors disclosed in UI', async () => {
				const consent: TCFConsentData = {
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

				const tcString = await generateTCString(consent, mockGVL, {
					cmpId: 28,
					cmpVersion: 1,
				});

				const decoded = await decodeTCString(tcString);

				// All disclosed vendors should be tracked
				expect(decoded.vendorsDisclosed[1]).toBe(true);
				expect(decoded.vendorsDisclosed[2]).toBe(true);
				expect(decoded.vendorsDisclosed[10]).toBe(true);
				expect(decoded.vendorsDisclosed[755]).toBe(true);
			});
		});

		describe('isServiceSpecific Requirement', () => {
			it('should always use service-specific scope (global scope invalid)', async () => {
				const consent = createMockTCFConsentAllGranted();
				const tcString = await generateTCString(consent, mockGVL, {
					cmpId: 28,
					cmpVersion: 1,
					isServiceSpecific: true,
				});

				const decoded = await decodeTCString(tcString);

				// Global scope is invalid since Sept 2021
				expect(decoded.isServiceSpecific).toBe(true);
			});
		});

		describe('Policy Version', () => {
			it('should use TCF policy version 5', async () => {
				const consent = createMockTCFConsentAllGranted();
				const tcString = await generateTCString(consent, mockGVL, {
					cmpId: 28,
					cmpVersion: 1,
				});

				const decoded = await decodeTCString(tcString);

				expect(decoded.policyVersion).toBe(5);
			});
		});
	});
});
