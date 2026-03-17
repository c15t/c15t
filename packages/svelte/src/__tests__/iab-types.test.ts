/**
 * Tests for processGVLData IAB type processing.
 *
 * Tests the transformation of raw GVL (Global Vendor List) data
 * into UI-friendly processed format.
 */

import type { GlobalVendorList } from 'c15t';
import { describe, expect, test } from 'vitest';
import { type NonIABVendor, processGVLData } from '../iab-types';

// Helper to create a minimal GVL fixture
function createGVL(
	overrides: Partial<GlobalVendorList> = {}
): GlobalVendorList {
	return {
		gvlSpecificationVersion: 3,
		vendorListVersion: 1,
		tcfPolicyVersion: 4,
		lastUpdated: '2024-01-01',
		vendors: {},
		purposes: {},
		specialPurposes: {},
		specialFeatures: {},
		features: {},
		stacks: {},
		dataCategories: {},
		...overrides,
	} as GlobalVendorList;
}

function createVendor(
	overrides: Partial<GlobalVendorList['vendors'][string]> = {}
) {
	return {
		name: 'Test Vendor',
		purposes: [],
		legIntPurposes: [],
		specialPurposes: [],
		specialFeatures: [],
		features: [],
		usesNonCookieAccess: false,
		usesCookies: true,
		cookieMaxAgeSeconds: 31536000,
		cookieRefresh: false,
		deviceStorageDisclosureUrl: null,
		urls: [],
		dataRetention: undefined,
		...overrides,
	} as GlobalVendorList['vendors'][string];
}

function createPurpose(name: string, description = 'Test description') {
	return {
		name,
		description,
		descriptionLegal: `${description} (legal)`,
		illustrations: [],
	};
}

// ─── Basic purpose processing ────────────────────────────────────────────────

describe('processGVLData', () => {
	describe('basic purpose processing', () => {
		test('processes purposes with matching vendors', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
				},
				vendors: {
					'100': createVendor({
						name: 'AdCorp',
						purposes: [2],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(result.purposes).toHaveLength(1);
			expect(result.purposes[0].id).toBe(2);
			expect(result.purposes[0].name).toBe('Advertising');
			expect(result.purposes[0].vendors).toHaveLength(1);
			expect(result.purposes[0].vendors[0].name).toBe('AdCorp');
		});

		test('filters out purposes with no vendors', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
					'3': createPurpose('Analytics'),
				},
				vendors: {
					'100': createVendor({
						name: 'AdCorp',
						purposes: [2],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(result.purposes).toHaveLength(1);
			expect(result.purposes[0].id).toBe(2);
		});

		test('includes vendors that match by legIntPurpose', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
				},
				vendors: {
					'100': createVendor({
						name: 'LegitCorp',
						purposes: [],
						legIntPurposes: [2],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(result.purposes).toHaveLength(1);
			expect(result.purposes[0].vendors).toHaveLength(1);
			expect(result.purposes[0].vendors[0].name).toBe('LegitCorp');
			expect(result.purposes[0].vendors[0].usesLegitimateInterest).toBe(true);
		});

		test('includes vendors matching by purpose OR legIntPurpose', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
				},
				vendors: {
					'100': createVendor({
						name: 'ConsentVendor',
						purposes: [2],
					}),
					'101': createVendor({
						name: 'LegitVendor',
						legIntPurposes: [2],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(result.purposes[0].vendors).toHaveLength(2);
		});
	});

	// ─── Custom vendors ──────────────────────────────────────────────────────

	describe('custom vendors', () => {
		test('custom vendors added to purpose vendor lists', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
				},
				vendors: {},
			});

			const customVendors: NonIABVendor[] = [
				{
					id: 'custom-1',
					name: 'Custom Analytics',
					privacyPolicyUrl: 'https://example.com/privacy',
					purposes: [2],
				},
			];

			const result = processGVLData(gvl, customVendors);
			expect(result.purposes).toHaveLength(1);
			expect(result.purposes[0].vendors).toHaveLength(1);
			expect(result.purposes[0].vendors[0].name).toBe('Custom Analytics');
		});

		test('custom vendors marked with isCustom: true', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
				},
				vendors: {
					'100': createVendor({
						name: 'IABVendor',
						purposes: [2],
					}),
				},
			});

			const customVendors: NonIABVendor[] = [
				{
					id: 'custom-1',
					name: 'CustomVendor',
					privacyPolicyUrl: 'https://example.com/privacy',
					purposes: [2],
				},
			];

			const result = processGVLData(gvl, customVendors);
			const iabVendor = result.purposes[0].vendors.find(
				(v) => v.name === 'IABVendor'
			);
			const customVendor = result.purposes[0].vendors.find(
				(v) => v.name === 'CustomVendor'
			);

			expect(iabVendor?.isCustom).toBe(false);
			expect(customVendor?.isCustom).toBe(true);
		});

		test('custom vendor fields mapped correctly', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
				},
				vendors: {},
			});

			const customVendors: NonIABVendor[] = [
				{
					id: 'cv-1',
					name: 'My Vendor',
					privacyPolicyUrl: 'https://example.com/privacy',
					purposes: [2],
					legIntPurposes: [2],
					usesCookies: true,
					usesNonCookieAccess: true,
					cookieMaxAgeSeconds: 3600,
				},
			];

			const result = processGVLData(gvl, customVendors);
			const vendor = result.purposes[0].vendors[0];

			expect(vendor.id).toBe('cv-1');
			expect(vendor.name).toBe('My Vendor');
			expect(vendor.policyUrl).toBe('https://example.com/privacy');
			expect(vendor.usesCookies).toBe(true);
			expect(vendor.usesNonCookieAccess).toBe(true);
			expect(vendor.cookieMaxAgeSeconds).toBe(3600);
			expect(vendor.usesLegitimateInterest).toBe(true);
		});
	});

	// ─── Special purposes ────────────────────────────────────────────────────

	describe('special purposes', () => {
		test('processes special purposes with matching vendors', () => {
			const gvl = createGVL({
				specialPurposes: {
					'1': createPurpose('Security'),
				},
				vendors: {
					'100': createVendor({
						name: 'SecVendor',
						specialPurposes: [1],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(result.specialPurposes).toHaveLength(1);
			expect(result.specialPurposes[0].name).toBe('Security');
			expect(result.specialPurposes[0].isSpecialPurpose).toBe(true);
			expect(result.specialPurposes[0].vendors).toHaveLength(1);
		});

		test('empty when no vendors match', () => {
			const gvl = createGVL({
				specialPurposes: {
					'1': createPurpose('Security'),
				},
				vendors: {
					'100': createVendor({
						name: 'AdCorp',
						specialPurposes: [],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(result.specialPurposes).toHaveLength(0);
		});
	});

	// ─── Special features ────────────────────────────────────────────────────

	describe('special features', () => {
		test('processes special features with matching vendors', () => {
			const gvl = createGVL({
				specialFeatures: {
					'1': createPurpose('Geolocation'),
				},
				vendors: {
					'100': createVendor({
						name: 'GeoVendor',
						specialFeatures: [1],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(result.specialFeatures).toHaveLength(1);
			expect(result.specialFeatures[0].name).toBe('Geolocation');
			expect(result.specialFeatures[0].vendors).toHaveLength(1);
		});

		test('empty when no vendors match', () => {
			const gvl = createGVL({
				specialFeatures: {
					'1': createPurpose('Geolocation'),
				},
				vendors: {},
			});

			const result = processGVLData(gvl);
			expect(result.specialFeatures).toHaveLength(0);
		});
	});

	// ─── Features ────────────────────────────────────────────────────────────

	describe('features', () => {
		test('processes features with matching vendors', () => {
			const gvl = createGVL({
				features: {
					'1': createPurpose('Cross-device linking'),
				},
				vendors: {
					'100': createVendor({
						name: 'LinkVendor',
						features: [1],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(result.features).toHaveLength(1);
			expect(result.features[0].name).toBe('Cross-device linking');
			expect(result.features[0].vendors).toHaveLength(1);
		});
	});

	// ─── Stack grouping ──────────────────────────────────────────────────────

	describe('stack grouping', () => {
		test('purpose 1 is always standalone', () => {
			const gvl = createGVL({
				purposes: {
					'1': createPurpose('Storage'),
					'2': createPurpose('Advertising'),
					'3': createPurpose('Analytics'),
				},
				vendors: {
					'100': createVendor({
						name: 'Vendor',
						purposes: [1, 2, 3],
					}),
				},
				stacks: {
					'1': {
						name: 'Ad Stack',
						description: 'Advertising stack',
						purposes: [1, 2, 3],
					},
				},
			});

			const result = processGVLData(gvl);
			// Purpose 1 should be in standalone, not in stacks
			const standalonePurposeIds = result.standalonePurposes.map((p) => p.id);
			expect(standalonePurposeIds).toContain(1);

			// Stack should not contain purpose 1
			for (const stack of result.stacks) {
				const stackPurposeIds = stack.purposes.map((p) => p.id);
				expect(stackPurposeIds).not.toContain(1);
			}
		});

		test('stacks need ≥2 purposes to be selected', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
					'3': createPurpose('Analytics'),
				},
				vendors: {
					'100': createVendor({
						name: 'Vendor',
						purposes: [2, 3],
					}),
				},
				stacks: {
					'1': {
						name: 'Single Purpose Stack',
						description: 'Only one purpose',
						purposes: [2],
					},
					'2': {
						name: 'Multi Stack',
						description: 'Multiple purposes',
						purposes: [2, 3],
					},
				},
			});

			const result = processGVLData(gvl);
			// Only the multi-purpose stack should be selected
			expect(result.stacks).toHaveLength(1);
			expect(result.stacks[0].name).toBe('Multi Stack');
			expect(result.stacks[0].purposes).toHaveLength(2);
		});

		test('higher-scoring stacks selected first', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
					'3': createPurpose('Analytics'),
					'4': createPurpose('Personalization'),
					'5': createPurpose('Measurement'),
				},
				vendors: {
					'100': createVendor({
						name: 'Vendor',
						purposes: [2, 3, 4, 5],
					}),
				},
				stacks: {
					'1': {
						name: 'Small Stack',
						description: 'Two purposes',
						purposes: [2, 3],
					},
					'2': {
						name: 'Big Stack',
						description: 'Three purposes',
						purposes: [2, 3, 4],
					},
				},
			});

			const result = processGVLData(gvl);
			// Big Stack should be selected first (covers 3 purposes)
			expect(result.stacks[0].name).toBe('Big Stack');
			expect(result.stacks[0].purposes).toHaveLength(3);
		});

		test('purposes only assigned to one stack', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
					'3': createPurpose('Analytics'),
					'4': createPurpose('Personalization'),
					'5': createPurpose('Measurement'),
				},
				vendors: {
					'100': createVendor({
						name: 'Vendor',
						purposes: [2, 3, 4, 5],
					}),
				},
				stacks: {
					'1': {
						name: 'Stack A',
						description: 'First stack',
						purposes: [2, 3],
					},
					'2': {
						name: 'Stack B',
						description: 'Overlapping stack',
						purposes: [3, 4],
					},
					'3': {
						name: 'Stack C',
						description: 'Third stack',
						purposes: [4, 5],
					},
				},
			});

			const result = processGVLData(gvl);
			// Collect all purpose IDs assigned to stacks
			const allStackPurposeIds = result.stacks.flatMap((s) =>
				s.purposes.map((p) => p.id)
			);

			// No duplicates
			const unique = new Set(allStackPurposeIds);
			expect(unique.size).toBe(allStackPurposeIds.length);
		});

		test('unassigned purposes become standalone', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
					'3': createPurpose('Analytics'),
					'4': createPurpose('Personalization'),
				},
				vendors: {
					'100': createVendor({
						name: 'Vendor',
						purposes: [2, 3, 4],
					}),
				},
				stacks: {
					'1': {
						name: 'Ad Stack',
						description: 'Ad purposes',
						purposes: [2, 3],
					},
				},
			});

			const result = processGVLData(gvl);
			// Purpose 4 not in any stack, should be standalone
			const standaloneIds = result.standalonePurposes.map((p) => p.id);
			expect(standaloneIds).toContain(4);
		});
	});

	// ─── Edge cases ──────────────────────────────────────────────────────────

	describe('edge cases', () => {
		test('empty GVL returns empty arrays', () => {
			const gvl = createGVL();
			const result = processGVLData(gvl);

			expect(result.purposes).toHaveLength(0);
			expect(result.specialPurposes).toHaveLength(0);
			expect(result.specialFeatures).toHaveLength(0);
			expect(result.features).toHaveLength(0);
			expect(result.stacks).toHaveLength(0);
			expect(result.standalonePurposes).toHaveLength(0);
		});

		test('missing optional fields handled gracefully', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
				},
				vendors: {
					'100': createVendor({
						name: 'Vendor',
						purposes: [2],
					}),
				},
				specialPurposes:
					undefined as unknown as GlobalVendorList['specialPurposes'],
				specialFeatures:
					undefined as unknown as GlobalVendorList['specialFeatures'],
				features: undefined as unknown as GlobalVendorList['features'],
				stacks: undefined as unknown as GlobalVendorList['stacks'],
			});

			// Should not throw
			const result = processGVLData(gvl);
			expect(result.purposes).toHaveLength(1);
			expect(result.specialPurposes).toHaveLength(0);
			expect(result.specialFeatures).toHaveLength(0);
			expect(result.features).toHaveLength(0);
			expect(result.stacks).toHaveLength(0);
		});

		test('vendor with legitimateInterestUrl from urls array', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
				},
				vendors: {
					'100': createVendor({
						name: 'LegitVendor',
						purposes: [2],
						urls: [
							{
								legIntClaim: 'https://example.com/legit-interest',
							},
						] as unknown as GlobalVendorList['vendors'][string]['urls'],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(result.purposes[0].vendors[0].legitimateInterestUrl).toBe(
				'https://example.com/legit-interest'
			);
		});

		test('vendor id is converted to number', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
				},
				vendors: {
					'42': createVendor({
						name: 'Vendor42',
						purposes: [2],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(result.purposes[0].vendors[0].id).toBe(42);
		});

		test('no custom vendors by default', () => {
			const gvl = createGVL({
				purposes: {
					'2': createPurpose('Advertising'),
				},
				vendors: {
					'100': createVendor({
						name: 'Vendor',
						purposes: [2],
					}),
				},
			});

			const result = processGVLData(gvl);
			expect(
				result.purposes[0].vendors.every((v) => v.isCustom === false)
			).toBe(true);
		});
	});
});
