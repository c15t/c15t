import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { globalVendorListSchema } from './gvl';

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
});
