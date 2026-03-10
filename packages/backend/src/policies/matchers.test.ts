import { describe, expect, it } from 'vitest';
import {
	EEA_COUNTRY_CODES,
	EU_COUNTRY_CODES,
	policyMatchers,
	UK_COUNTRY_CODES,
} from './matchers';

describe('policyMatchers', () => {
	it('returns normalized countries', () => {
		expect(policyMatchers.countries(['de', 'FR', 'de'])).toEqual({
			countries: ['DE', 'FR'],
		});
	});

	it('returns EU and EEA groups', () => {
		expect(policyMatchers.eu()).toEqual({
			countries: [...EU_COUNTRY_CODES],
		});
		expect(policyMatchers.eea()).toEqual({
			countries: [...EEA_COUNTRY_CODES],
		});
		expect(policyMatchers.uk()).toEqual({
			countries: [...UK_COUNTRY_CODES],
		});
	});

	it('returns IAB helper', () => {
		expect(policyMatchers.iab()).toEqual({
			countries: [...EEA_COUNTRY_CODES, ...UK_COUNTRY_CODES],
		});
	});

	it('merges match fragments', () => {
		expect(
			policyMatchers.merge(
				policyMatchers.eea(),
				policyMatchers.regions([{ country: 'us', region: 'ca' }])
			)
		).toEqual({
			countries: [...EEA_COUNTRY_CODES],
			regions: [{ country: 'US', region: 'CA' }],
		});
	});
});
