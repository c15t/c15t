import { describe, expect, it } from 'vitest';
import { checkJurisdiction } from './jurisdiction';

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
			const result = checkJurisdiction(countryCode);

			expect(result).toBe('GDPR');
		});
	});

	describe('GDPR jurisdiction (EEA countries)', () => {
		const eeaCountries = ['IS', 'NO', 'LI'];

		it.each(
			eeaCountries
		)('should identify %s as GDPR jurisdiction', (countryCode) => {
			const result = checkJurisdiction(countryCode);

			expect(result).toBe('GDPR');
		});
	});

	describe('GDPR jurisdiction (UK)', () => {
		it('should identify GB as GDPR jurisdiction', () => {
			const result = checkJurisdiction('GB');

			expect(result).toBe('GDPR');
		});
	});

	describe('Other specific jurisdictions', () => {
		const jurisdictionCases = [
			{ country: 'CH', code: 'CH', message: '' },
			{ country: 'BR', code: 'BR', message: '' },
			{ country: 'CA', code: 'PIPEDA', message: '' },
			{ country: 'AU', code: 'AU', message: '' },
			{ country: 'JP', code: 'APPI', message: '' },
			{ country: 'KR', code: 'PIPA', message: '' },
		] as const;

		it.each(
			jurisdictionCases
		)('should identify $country as $code jurisdiction', ({ country, code }) => {
			const result = checkJurisdiction(country);

			expect(result).toBe(code);
		});
	});

	describe('Non-regulated countries', () => {
		const nonRegulatedCountries = [
			'US', // United States
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
			const result = checkJurisdiction(countryCode);

			expect(result).toBe('NONE');
		});
	});

	describe('Edge cases', () => {
		it('should handle null country code by defaulting to NONE jurisdiction', () => {
			const result = checkJurisdiction(null);

			expect(result).toBe('NONE');
		});

		it('should handle empty string country code by defaulting to NONE jurisdiction', () => {
			const result = checkJurisdiction('');

			expect(result).toBe('NONE');
		});

		it('should handle lowercase country codes correctly', () => {
			const result = checkJurisdiction('de');

			// Should now match because we normalize to uppercase
			expect(result).toBe('GDPR');
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
				const result = checkJurisdiction(input);

				expect(result).toBe(expectedJurisdiction);
			}
		});

		it('should handle invalid country codes', () => {
			const invalidCodes = ['XX', 'ZZ', '123', 'ABC'];

			for (const code of invalidCodes) {
				const result = checkJurisdiction(code);

				expect(result).toBe('NONE');
			}
		});
	});

	describe('Return value structure', () => {
		it('should always return a jurisdiction code string', () => {
			const result = checkJurisdiction('DE');

			expect(typeof result).toBe('string');
		});

		it('should return consistent types regardless of input', () => {
			const inputs = ['DE', 'US', 'GB', 'XX', '', null];

			for (const input of inputs) {
				const result = checkJurisdiction(input);

				expect(typeof result).toBe('string');
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
					expectedShow: true,
				},
				{
					input: 'NO',
					expectedJurisdiction: 'GDPR' as const,
					expectedShow: true,
				},
				{
					input: 'GB',
					expectedJurisdiction: 'GDPR' as const,
					expectedShow: true,
				},
				{
					input: 'CH',
					expectedJurisdiction: 'CH' as const,
					expectedShow: true,
				},
				{
					input: 'BR',
					expectedJurisdiction: 'BR' as const,
					expectedShow: true,
				},
				{
					input: 'CA',
					expectedJurisdiction: 'PIPEDA' as const,
					expectedShow: true,
				},
				{
					input: 'AU',
					expectedJurisdiction: 'AU' as const,
					expectedShow: true,
				},
				{
					input: 'JP',
					expectedJurisdiction: 'APPI' as const,
					expectedShow: true,
				},
				{
					input: 'KR',
					expectedJurisdiction: 'PIPA' as const,
					expectedShow: true,
				},
				{
					input: 'US',
					expectedJurisdiction: 'NONE' as const,
					expectedShow: false,
				},
				{
					input: null,
					expectedJurisdiction: 'NONE' as const,
					expectedShow: true,
				},
			];

			for (const { input, expectedJurisdiction, expectedShow } of testCases) {
				const result = checkJurisdiction(input);

				expect(result).toBe(expectedJurisdiction);
			}
		});
	});
});
