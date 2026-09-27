import type { NonIABVendor } from '@c15t/core';
import { describe, expect, test } from 'vitest';

import {
	applyPublisherRestrictionsToGVL,
	processGVLForDialog,
	resolveIABBannerSummary,
	resolveIABDialogDisplayModel,
} from '../headless';
import { completeGVL } from './fixtures/gvl-sample';

const customVendor: NonIABVendor = {
	cookieMaxAgeSeconds: 31_536_000,
	features: [1],
	id: 'custom-analytics',
	legIntPurposes: [9],
	name: 'Custom Analytics',
	privacyPolicyUrl: 'https://example.com/privacy',
	purposes: [1, 8],
	specialFeatures: [2],
	usesCookies: true,
	usesNonCookieAccess: false,
};

describe('@c15t/iab headless dialog data', () => {
	test('derives purposes, vendors, stacks, features, and special features from a GVL', () => {
		const data = processGVLForDialog({
			customVendors: [customVendor],
			gvl: completeGVL,
		});

		expect(data.isReady).toBe(true);
		expect(data.isLoading).toBe(false);
		expect(data.totalVendors).toBe(5);
		expect(data.purposes).toHaveLength(11);
		expect(data.specialPurposes.map((purpose) => purpose.id)).toEqual([1, 2]);
		expect(data.features.map((feature) => feature.id)).toEqual([1, 2, 3]);
		expect(data.specialFeatures.map((feature) => feature.id)).toEqual([1, 2]);
		expect(data.stacks.map((stack) => stack.id)).toEqual([2, 3, 1, 4]);
		expect(data.standalonePurposes.map((purpose) => purpose.id)).toEqual([1]);
	});

	test('includes custom vendors in purpose derivation', () => {
		const data = processGVLForDialog({
			customVendors: [customVendor],
			gvl: completeGVL,
		});

		const storagePurpose = data.purposes.find((purpose) => purpose.id === 1);
		const analyticsVendor = storagePurpose?.vendors.find(
			(vendor) => vendor.id === 'custom-analytics'
		);

		expect(analyticsVendor).toMatchObject({
			isCustom: true,
			name: 'Custom Analytics',
			policyUrl: 'https://example.com/privacy',
			usesLegitimateInterest: false,
		});
	});

	test('partitions legitimate-interest vendors by purpose', () => {
		const data = processGVLForDialog({
			customVendors: [customVendor],
			gvl: completeGVL,
		});

		const statisticsPurpose = data.purposes.find((purpose) => purpose.id === 9);
		const liVendorIds = statisticsPurpose?.vendors
			.filter((vendor) => vendor.usesLegitimateInterest)
			.map((vendor) => vendor.id);

		expect(liVendorIds).toEqual([10, 'custom-analytics']);
		expect(
			statisticsPurpose?.vendors.find((vendor) => vendor.id === 755)
				?.usesLegitimateInterest
		).toBe(false);
	});
});

describe('@c15t/iab headless publisher restrictions', () => {
	// Vendor 755 declares purposes 1 to 11 for consent and is flexible on
	// 2, 7, 9, 10 and 11. Vendor 10 declares 2, 7, 9 and 10 for LI and is
	// not flexible.
	const vendorsFor = (
		purposeId: number,
		publisherRestrictions: Parameters<typeof applyPublisherRestrictionsToGVL>[1]
	) =>
		processGVLForDialog({
			gvl: completeGVL,
			publisherRestrictions,
		}).purposes.find((purpose) => purpose.id === purposeId)?.vendors ?? [];
	const vendor = (vendors: ReturnType<typeof vendorsFor>, id: number) =>
		vendors.find((entry) => entry.id === id);

	test('required LI (type 2) lists the vendor under legitimate interest', () => {
		expect(vendor(vendorsFor(7, []), 755)?.usesLegitimateInterest).toBe(false);
		const vendors = vendorsFor(7, [
			{ purposeId: 7, restrictionType: 2, vendorIds: [755] },
		]);
		expect(vendor(vendors, 755)).toMatchObject({
			legIntPurposes: [7],
			usesLegitimateInterest: true,
		});
		expect(vendor(vendors, 755)?.purposes).not.toContain(7);
	});

	test('required consent (type 1) lists the vendor under consent', () => {
		const flexible = {
			...completeGVL,
			vendors: {
				...completeGVL.vendors,
				10: { ...completeGVL.vendors[10], flexiblePurposes: [7] },
			},
		} as typeof completeGVL;
		const data = processGVLForDialog({
			gvl: flexible,
			publisherRestrictions: [
				{ purposeId: 7, restrictionType: 1, vendorIds: [10] },
			],
		});
		const restricted = data.purposes
			.find((purpose) => purpose.id === 7)
			?.vendors.find((entry) => entry.id === 10);
		expect(restricted?.usesLegitimateInterest).toBe(false);
		expect(restricted?.purposes).toContain(7);
	});

	test('a prohibited purpose (type 0) no longer lists the vendor', () => {
		const vendors = vendorsFor(7, [
			{ purposeId: 7, restrictionType: 0, vendorIds: [755] },
		]);
		expect(vendor(vendors, 755)).toBeUndefined();
		expect(vendor(vendors, 2)).toBeDefined();
	});

	test('a basis change the vendor list does not allow drops the purpose', () => {
		// Vendor 10 is not flexible on purpose 7, so it may not process it at all.
		expect(
			vendor(
				vendorsFor(7, [{ purposeId: 7, restrictionType: 1, vendorIds: [10] }]),
				10
			)
		).toBeUndefined();
	});

	test.each([
		[1, { legIntPurposes: [], purposes: [1, 7] }],
		[2, { legIntPurposes: [7], purposes: [1] }],
	] as const)(
		'type %i lists a purpose declared on both bases once',
		(restrictionType, expected) => {
			// Out of spec, but seen in lists: the purpose appears in both arrays.
			const both = {
				...completeGVL,
				vendors: {
					...completeGVL.vendors,
					755: {
						...completeGVL.vendors[755],
						flexiblePurposes: [7],
						legIntPurposes: [7],
						purposes: [1, 7],
					},
				},
			} as typeof completeGVL;
			const { vendors } = applyPublisherRestrictionsToGVL(both, [
				{ purposeId: 7, restrictionType, vendorIds: [755] },
			]);
			expect(vendors[755]).toMatchObject(expected);
		}
	);

	test.each([
		['without restrictions', undefined, true],
		[
			'when the only consent vendor must use LI',
			[{ purposeId: 7, restrictionType: 2 as const, vendorIds: [755] }],
			false,
		],
	])('purpose 7 consent basis %s', (_name, publisherRestrictions, expected) => {
		const { 10: liVendor, 755: consentVendor } = completeGVL.vendors;
		if (!(liVendor && consentVendor)) {
			throw new Error('Missing vendor fixtures');
		}
		const model = resolveIABDialogDisplayModel({
			gvl: {
				...completeGVL,
				vendors: { 10: liVendor, 755: consentVendor },
			},
			publisherRestrictions,
		});
		const rows = model.consentRows.flatMap((row) =>
			row.kind === 'stack' ? row.purposes : [row]
		);
		expect(
			rows.find((row) => row.kind === 'purpose' && row.id === 7)
				?.hasConsentBasis
		).toBe(expected);
	});

	test('returns the same list when nothing is restricted', () => {
		expect(applyPublisherRestrictionsToGVL(completeGVL, [])).toBe(completeGVL);
		expect(applyPublisherRestrictionsToGVL(completeGVL, undefined)).toBe(
			completeGVL
		);
	});
});

describe('@c15t/iab headless banner summary', () => {
	test('derives vendor count and display summary from stack and special-feature data', () => {
		const summary = resolveIABBannerSummary({
			customVendors: [customVendor],
			gvl: completeGVL,
		});

		expect(summary).toEqual({
			displayItems: [
				'Store and/or access information on a device',
				'Personalised advertising profile and target audience measurement',
				'Content personalisation',
				'Advertising based on limited data and advertising measurement',
				'Content measurement and product development',
			],
			isReady: true,
			remainingCount: 2,
			vendorCount: 5,
		});
	});
});
