import { describe, expect, it } from 'vitest';
import type { C15TGeoLocation, C15TRequestContext } from '~/types';
import { checkJurisdiction, extractLocation, getLocation } from './geo';

describe('checkJurisdiction', () => {
	describe('GDPR jurisdiction (EU countries)', () => {
		const euCountries = [
			'AT',
			'BE',
			'BG',
			'HR',
			'CY',
			'CZ',
			'DK',
			'EE',
			'FI',
			'FR',
			'DE',
			'GR',
			'HU',
			'IE',
			'IT',
			'LV',
			'LT',
			'LU',
			'MT',
			'NL',
			'PL',
			'PT',
			'RO',
			'SK',
			'SI',
			'ES',
			'SE',
		];

		it.each(
			euCountries
		)('should identify %s as GDPR jurisdiction', (countryCode) => {
			const jurisdiction = checkJurisdiction(countryCode);

			expect(jurisdiction).toBe('GDPR');
		});
	});

	describe('GDPR jurisdiction (EEA countries)', () => {
		const eeaCountries = ['IS', 'NO', 'LI'];

		it.each(
			eeaCountries
		)('should identify %s as GDPR jurisdiction', (countryCode) => {
			const jurisdiction = checkJurisdiction(countryCode);

			expect(jurisdiction).toBe('GDPR');
		});
	});

	describe('GDPR jurisdiction (UK)', () => {
		it('should identify GB as GDPR jurisdiction', () => {
			const jurisdiction = checkJurisdiction('GB');

			expect(jurisdiction).toBe('UK_GDPR');
		});
	});

	describe('Other specific jurisdictions', () => {
		const jurisdictionCases = [
			{ country: 'CH', code: 'CH' },
			{ country: 'BR', code: 'BR' },
			{ country: 'CA', code: 'PIPEDA' },
			{ country: 'AU', code: 'AU' },
			{ country: 'JP', code: 'APPI' },
			{ country: 'KR', code: 'PIPA' },
		] as const;

		it.each(
			jurisdictionCases
		)('should identify $country as $code jurisdiction', ({ country, code }) => {
			const jurisdiction = checkJurisdiction(country);

			expect(jurisdiction).toBe(code);
		});
	});

	describe('Non-regulated countries', () => {
		const nonRegulatedCountries = [
			'US', // United States (outside CCPA regions)
			'RU', // Russia
			'CN', // China
			'IN', // India
			'MX', // Mexico
			'AR', // Argentina
			'EG', // Egypt
			'ZA', // South Africa
			'TH', // Thailand
			'PH', // Philippines
		];

		it.each(
			nonRegulatedCountries
		)('should identify %s as non-regulated (NONE jurisdiction)', (countryCode) => {
			const jurisdiction = checkJurisdiction(countryCode);

			expect(jurisdiction).toBe('NONE');
		});
	});

	describe('Edge cases', () => {
		it('should handle null country code by defaulting to show banner with NONE jurisdiction', () => {
			const jurisdiction = checkJurisdiction(null);

			expect(jurisdiction).toBe('NONE');
		});

		it('should handle empty string country code by defaulting to show banner with NONE jurisdiction', () => {
			const jurisdiction = checkJurisdiction('');

			expect(jurisdiction).toBe('NONE');
		});

		it('should handle lowercase country codes correctly', () => {
			const jurisdiction = checkJurisdiction('de');

			// Should now match because we normalize to uppercase
			expect(jurisdiction).toBe('GDPR');
		});

		it('should handle mixed case country codes across different jurisdictions', () => {
			const testCases = [
				{ input: 'de', expectedJurisdiction: 'GDPR' },
				{ input: 'De', expectedJurisdiction: 'GDPR' },
				{ input: 'DE', expectedJurisdiction: 'GDPR' },
				{ input: 'ch', expectedJurisdiction: 'CH' },
				{ input: 'Ch', expectedJurisdiction: 'CH' },
				{ input: 'CH', expectedJurisdiction: 'CH' },
				{ input: 'ca', expectedJurisdiction: 'PIPEDA' },
				{ input: 'Ca', expectedJurisdiction: 'PIPEDA' },
				{ input: 'CA', expectedJurisdiction: 'PIPEDA' },
			] as const;

			for (const { input, expectedJurisdiction } of testCases) {
				const jurisdiction = checkJurisdiction(input);

				expect(jurisdiction).toBe(expectedJurisdiction);
			}
		});

		it('should handle invalid country codes', () => {
			const invalidCodes = ['XX', 'ZZ', '123', 'ABC'];

			for (const code of invalidCodes) {
				const jurisdiction = checkJurisdiction(code);

				expect(jurisdiction).toBe('NONE');
			}
		});
	});

	describe('Return value structure', () => {
		it('should always return an object with required properties', () => {
			const jurisdiction = checkJurisdiction('DE');

			expect(jurisdiction).toBe('GDPR');
		});

		it('should return consistent types regardless of input', () => {
			const inputs = ['DE', 'US', 'GB', 'XX', '', null];

			for (const input of inputs) {
				const jurisdiction = checkJurisdiction(input);

				expect(typeof jurisdiction).toBe('string');
			}
		});
	});

	describe('Comprehensive jurisdiction mapping', () => {
		it('should correctly map all supported jurisdictions', () => {
			// Test one representative from each jurisdiction group
			const testCases = [
				{
					input: 'DE',
					expectedJurisdiction: 'GDPR' as const,
				},
				{
					input: 'NO',
					expectedJurisdiction: 'GDPR' as const,
				},
				{
					input: 'GB',
					expectedJurisdiction: 'UK_GDPR' as const,
				},
				{
					input: 'CH',
					expectedJurisdiction: 'CH' as const,
				},
				{
					input: 'BR',
					expectedJurisdiction: 'BR' as const,
				},
				{
					input: 'CA',
					expectedJurisdiction: 'PIPEDA' as const,
				},
				{
					input: 'AU',
					expectedJurisdiction: 'AU' as const,
				},
				{
					input: 'JP',
					expectedJurisdiction: 'APPI' as const,
				},
				{
					input: 'KR',
					expectedJurisdiction: 'PIPA' as const,
				},
				{
					input: 'US',
					expectedJurisdiction: 'NONE' as const,
				},
				{
					input: null,
					expectedJurisdiction: 'NONE' as const,
				},
			];

			for (const { input, expectedJurisdiction } of testCases) {
				const jurisdiction = checkJurisdiction(input);

				expect(jurisdiction).toBe(expectedJurisdiction);
			}
		});
	});

	describe('Quebec Law 25 jurisdiction (CA regions)', () => {
		it('should identify CA-QC as QC_LAW25 jurisdiction (case-insensitive)', () => {
			const cases = ['QC', 'qc', 'Qc'];

			for (const region of cases) {
				const jurisdiction = checkJurisdiction('CA', region);

				expect(jurisdiction).toBe('QC_LAW25');
			}
		});

		it('should handle dash-separated region codes for Quebec', () => {
			const cases = ['CA-QC', 'ca-qc', 'Ca-Qc'];

			for (const region of cases) {
				const jurisdiction = checkJurisdiction('CA', region);

				expect(jurisdiction).toBe('QC_LAW25');
			}
		});

		it('should return PIPEDA for non-Quebec Canadian provinces', () => {
			const nonQuebecRegions = ['ON', 'BC', 'AB', null];

			for (const region of nonQuebecRegions) {
				const jurisdiction = checkJurisdiction('CA', region as string | null);

				expect(jurisdiction).toBe('PIPEDA');
			}
		});

		it('should return PIPEDA for dash-separated non-Quebec Canadian provinces', () => {
			const nonQuebecRegions = ['CA-ON', 'CA-BC', 'CA-AB'];

			for (const region of nonQuebecRegions) {
				const jurisdiction = checkJurisdiction('CA', region);

				expect(jurisdiction).toBe('PIPEDA');
			}
		});
	});

	describe('CCPA jurisdiction (US regions)', () => {
		it('should identify US-CA as CCPA jurisdiction (case-insensitive)', () => {
			const cases = ['CA', 'ca', 'Ca'];

			for (const region of cases) {
				const jurisdiction = checkJurisdiction('US', region);

				expect(jurisdiction).toBe('CCPA');
			}
		});

		it('should handle dash-separated region codes for California', () => {
			const cases = ['US-CA', 'us-ca', 'Us-Ca'];

			for (const region of cases) {
				const jurisdiction = checkJurisdiction('US', region);

				expect(jurisdiction).toBe('CCPA');
			}
		});

		it('should not apply CCPA for non-CCPA US regions', () => {
			const nonCcpaRegions = ['NY', 'TX', 'WA', 'FL', null];

			for (const region of nonCcpaRegions) {
				const jurisdiction = checkJurisdiction('US', region as string | null);

				expect(jurisdiction).toBe('NONE');
			}
		});

		it('should not apply CCPA for dash-separated non-CCPA US regions', () => {
			const nonCcpaRegions = ['US-NY', 'US-TX', 'US-WA'];

			for (const region of nonCcpaRegions) {
				const jurisdiction = checkJurisdiction('US', region);

				expect(jurisdiction).toBe('NONE');
			}
		});
	});
});

const netlifyCalifornia = {
	geo: {
		country: { code: 'US' },
		subdivision: { code: 'CA' },
	},
} satisfies C15TRequestContext;

const netlifyQuebec = {
	geo: {
		country: { code: 'CA' },
		subdivision: { code: 'QC' },
	},
} satisfies C15TRequestContext;

describe('extractLocation', () => {
	it('reads country from x-country with a null region', () => {
		const headers = new Headers({ 'x-country': 'DE' });
		expect(extractLocation(headers)).toEqual({
			countryCode: 'DE',
			regionCode: null,
		});
	});

	it('reads country and subdivision from Netlify context', () => {
		expect(extractLocation(new Headers(), netlifyCalifornia.geo)).toEqual({
			countryCode: 'US',
			regionCode: 'CA',
		});
	});

	it('reads an unprefixed Netlify subdivision', () => {
		const location = extractLocation(new Headers(), netlifyQuebec.geo);
		expect(location).toEqual({
			countryCode: 'CA',
			regionCode: 'QC',
		});
		expect(checkJurisdiction(location.countryCode, location.regionCode)).toBe(
			'QC_LAW25'
		);
	});

	it('falls back to headers when country is missing from context', () => {
		const geo: C15TGeoLocation = {
			subdivision: { code: 'CA' },
		};
		const headers = new Headers({ 'cf-ipcountry': 'US' });
		expect(extractLocation(headers, geo)).toEqual({
			countryCode: 'US',
			regionCode: 'CA',
		});
	});

	it('falls back to headers when subdivision is missing from context', () => {
		const geo: C15TGeoLocation = {
			country: { code: 'US' },
		};
		const headers = new Headers({ 'x-vercel-ip-country-region': 'NY' });
		expect(extractLocation(headers, geo)).toEqual({
			countryCode: 'US',
			regionCode: 'NY',
		});
	});

	it('falls back to headers when geo is null', () => {
		const headers = new Headers({ 'cf-ipcountry': 'FR' });
		expect(extractLocation(headers, null)).toEqual({
			countryCode: 'FR',
			regionCode: null,
		});
	});

	it('treats empty context codes as missing and uses headers', () => {
		const geo: C15TGeoLocation = {
			country: { code: '' },
			subdivision: { code: '' },
		};
		const headers = new Headers({
			'x-country-code': 'IE',
			'x-region-code': 'L',
		});
		expect(extractLocation(headers, geo)).toEqual({
			countryCode: 'IE',
			regionCode: 'L',
		});
	});

	it('lets x-c15t-country and x-c15t-region override context', () => {
		const headers = new Headers({
			'x-c15t-country': 'DE',
			'x-c15t-region': 'BE',
		});
		expect(extractLocation(headers, netlifyCalifornia.geo)).toEqual({
			countryCode: 'DE',
			regionCode: 'BE',
		});
	});

	it('lets context override provider and generic fallback headers', () => {
		const headers = new Headers({
			'cf-ipcountry': 'DE',
			'x-vercel-ip-country': 'FR',
			'x-amz-cf-ipcountry': 'GB',
			'x-country': 'IT',
			'x-country-code': 'ES',
			'x-vercel-ip-country-region': 'NY',
			'x-region-code': 'TX',
		});
		expect(extractLocation(headers, netlifyCalifornia.geo)).toEqual({
			countryCode: 'US',
			regionCode: 'CA',
		});
	});

	it('keeps cf-ipcountry above Vercel when context is absent', () => {
		const headers = new Headers({
			'cf-ipcountry': 'DE',
			'x-vercel-ip-country': 'FR',
		});
		expect(extractLocation(headers)).toEqual({
			countryCode: 'DE',
			regionCode: null,
		});
	});

	it('uses x-country-code and x-region-code as the final fallbacks', () => {
		const headers = new Headers({
			'x-country-code': 'JP',
			'x-region-code': '13',
		});
		expect(extractLocation(headers)).toEqual({
			countryCode: 'JP',
			regionCode: '13',
		});
	});

	it('does not throw when headers are undefined', () => {
		expect(extractLocation(undefined, netlifyCalifornia.geo)).toEqual({
			countryCode: 'US',
			regionCode: 'CA',
		});
		expect(extractLocation(undefined)).toEqual({
			countryCode: null,
			regionCode: null,
		});
	});
});

describe('getLocation', () => {
	it('returns Netlify context country and subdivision', async () => {
		const request = new Request('http://localhost/');
		const result = await getLocation(request, {}, netlifyCalifornia.geo);
		expect(result).toEqual({ countryCode: 'US', regionCode: 'CA' });
		expect(checkJurisdiction(result.countryCode, result.regionCode)).toBe(
			'CCPA'
		);
	});

	it('returns nulls when geo is disabled even if context and headers exist', async () => {
		const request = new Request('http://localhost/', {
			headers: {
				'x-country': 'DE',
				'cf-ipcountry': 'FR',
			},
		});
		const result = await getLocation(
			request,
			{ disableGeoLocation: true },
			netlifyCalifornia.geo
		);
		expect(result).toEqual({ countryCode: null, regionCode: null });
	});
});
