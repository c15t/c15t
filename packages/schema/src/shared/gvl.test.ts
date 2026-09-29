import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { globalVendorListSchema } from './gvl';
import type { GlobalVendorList } from './gvl';

const vendorList = {
	features: {},
	gvlSpecificationVersion: 3,
	lastUpdated: '2026-09-05T00:00:00Z',
	purposes: {},
	specialFeatures: {},
	specialPurposes: {},
	stacks: {},
	tcfPolicyVersion: 5,
	vendorListVersion: 1,
	vendors: {
		'1': {
			cookieMaxAgeSeconds: null,
			cookieRefresh: false,
			features: [],
			flexiblePurposes: [],
			id: 1,
			legIntPurposes: [],
			name: 'Example vendor',
			purposes: [1],
			specialFeatures: [],
			specialPurposes: [],
			urls: [{ langId: 'en', privacy: 'https://example.com/privacy' }],
			usesCookies: false,
			usesNonCookieAccess: false,
		},
	},
};

describe('global vendor list validation', () => {
	it('accepts a vendor list and still validates nested vendor fields', () => {
		expect(v.safeParse(globalVendorListSchema, vendorList).success).toBe(true);
		const result = v.safeParse(globalVendorListSchema, {
			...vendorList,
			vendors: { '1': { ...vendorList.vendors['1'], id: 'invalid-id' } },
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid top-level types', () => {
		expect(
			v.safeParse(globalVendorListSchema, {
				...vendorList,
				gvlSpecificationVersion: '3',
			}).success
		).toBe(false);
	});

	it('keeps standardTexts and fields the IAB adds later', () => {
		const standardTexts = {
			features:
				'These means of processing can be used solely in pursuit of one or several purposes for which you are given a choice in this notice.',
		};
		const result = v.safeParse(globalVendorListSchema, {
			...vendorList,
			futureField: { added: 'later' },
			standardTexts,
			vendors: {
				'1': { ...vendorList.vendors['1'], futureVendorField: true },
			},
		});

		expect(result.success).toBe(true);
		expect(result.output).toMatchObject({
			futureField: { added: 'later' },
			standardTexts,
			vendors: { '1': { futureVendorField: true } },
		});
	});

	it('types only the fields c15t knows', () => {
		const parsed: GlobalVendorList = v.parse(
			globalVendorListSchema,
			vendorList
		);

		expect(parsed.standardTexts).toBeUndefined();
		// @ts-expect-error Unknown fields pass through at runtime but are not typed.
		expect(parsed.futureField).toBeUndefined();
	});

	it('rejects standardTexts without a features string', () => {
		expect(
			v.safeParse(globalVendorListSchema, {
				...vendorList,
				standardTexts: { purposes: 'Purposes text' },
			}).success
		).toBe(false);
	});
});
