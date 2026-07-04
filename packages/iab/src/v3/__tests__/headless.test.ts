import type { NonIABVendor } from 'c15t/v3';
import { describe, expect, test } from 'vitest';
import { completeGVL } from '../../__tests__/tcf/fixtures/gvl-sample';
import { processGVLForDialog, resolveIABBannerSummary } from '../headless';

const customVendor: NonIABVendor = {
	id: 'custom-analytics',
	name: 'Custom Analytics',
	privacyPolicyUrl: 'https://example.com/privacy',
	purposes: [1, 8],
	legIntPurposes: [9],
	features: [1],
	specialFeatures: [2],
	usesCookies: true,
	usesNonCookieAccess: false,
	cookieMaxAgeSeconds: 31_536_000,
};

describe('@c15t/iab/v3 headless dialog data', () => {
	test('derives purposes, vendors, stacks, features, and special features from a GVL', () => {
		const data = processGVLForDialog({
			gvl: completeGVL,
			customVendors: [customVendor],
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
			gvl: completeGVL,
			customVendors: [customVendor],
		});

		const storagePurpose = data.purposes.find((purpose) => purpose.id === 1);
		const analyticsVendor = storagePurpose?.vendors.find(
			(vendor) => vendor.id === 'custom-analytics'
		);

		expect(analyticsVendor).toMatchObject({
			name: 'Custom Analytics',
			isCustom: true,
			policyUrl: 'https://example.com/privacy',
			usesLegitimateInterest: false,
		});
	});

	test('partitions legitimate-interest vendors by purpose', () => {
		const data = processGVLForDialog({
			gvl: completeGVL,
			customVendors: [customVendor],
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

describe('@c15t/iab/v3 headless banner summary', () => {
	test('derives vendor count and display summary from stack and special-feature data', () => {
		const summary = resolveIABBannerSummary({
			gvl: completeGVL,
			customVendors: [customVendor],
		});

		expect(summary).toEqual({
			isReady: true,
			vendorCount: 5,
			displayItems: [
				'Store and/or access information on a device',
				'Personalised advertising profile and target audience measurement',
				'Content personalisation',
				'Advertising based on limited data and advertising measurement',
				'Content measurement and product development',
			],
			remainingCount: 2,
		});
	});
});
