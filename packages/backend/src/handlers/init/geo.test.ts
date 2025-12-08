import { describe, expect, it } from 'vitest';
import { checkJurisdiction } from './geo';

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

	describe('CCPA jurisdiction (US regions)', () => {
		it('should identify US-CA as CCPA jurisdiction (case-insensitive)', () => {
			const cases = ['CA', 'ca', 'Ca'];

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
	});
});
