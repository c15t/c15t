import { describe, expect, it } from 'vitest';
import { JurisdictionMessages } from '~/contracts/shared/jurisdiction.schema';
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

		it.each(euCountries)(
			'should identify %s as GDPR jurisdiction',
			(countryCode) => {
				const result = checkJurisdiction(countryCode);

				expect(result.showConsentBanner).toBe(true);
				expect(result.jurisdictionCode).toBe('GDPR');
				expect(result.message).toBe(JurisdictionMessages.GDPR);
			}
		);
	});

	describe('GDPR jurisdiction (EEA countries)', () => {
		const eeaCountries = ['IS', 'NO', 'LI'];

		it.each(eeaCountries)(
			'should identify %s as GDPR jurisdiction',
			(countryCode) => {
				const result = checkJurisdiction(countryCode);

				expect(result.showConsentBanner).toBe(true);
				expect(result.jurisdictionCode).toBe('GDPR');
				expect(result.message).toBe(JurisdictionMessages.GDPR);
			}
		);
	});

	describe('GDPR jurisdiction (UK)', () => {
		it('should identify GB as GDPR jurisdiction', () => {
			const result = checkJurisdiction('GB');

			expect(result.showConsentBanner).toBe(true);
			expect(result.jurisdictionCode).toBe('GDPR');
			expect(result.message).toBe(JurisdictionMessages.GDPR);
		});
	});

	describe('Other specific jurisdictions', () => {
		const jurisdictionCases = [
			{ country: 'CH', code: 'CH', message: JurisdictionMessages.CH },
			{ country: 'BR', code: 'BR', message: JurisdictionMessages.BR },
			{ country: 'CA', code: 'PIPEDA', message: JurisdictionMessages.PIPEDA },
			{ country: 'AU', code: 'AU', message: JurisdictionMessages.AU },
			{ country: 'JP', code: 'APPI', message: JurisdictionMessages.APPI },
			{ country: 'KR', code: 'PIPA', message: JurisdictionMessages.PIPA },
		] as const;

		it.each(jurisdictionCases)(
			'should identify $country as $code jurisdiction',
			({ country, code, message }) => {
				const result = checkJurisdiction(country);

				expect(result.showConsentBanner).toBe(true);
				expect(result.jurisdictionCode).toBe(code);
				expect(result.message).toBe(message);
			}
		);
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

		it.each(nonRegulatedCountries)(
			'should identify %s as non-regulated (NONE jurisdiction)',
			(countryCode) => {
				const result = checkJurisdiction(countryCode);

				expect(result.showConsentBanner).toBe(false);
				expect(result.jurisdictionCode).toBe('NONE');
				expect(result.message).toBe(JurisdictionMessages.NONE);
			}
		);
	});

	describe('Edge cases', () => {
		it('should handle null country code by defaulting to show banner with NONE jurisdiction', () => {
			const result = checkJurisdiction(null);

			expect(result.showConsentBanner).toBe(true);
			expect(result.jurisdictionCode).toBe('NONE');
			expect(result.message).toBe(JurisdictionMessages.NONE);
		});

		it('should handle empty string country code by defaulting to show banner with NONE jurisdiction', () => {
			const result = checkJurisdiction('');

			expect(result.showConsentBanner).toBe(true);
			expect(result.jurisdictionCode).toBe('NONE');
			expect(result.message).toBe(JurisdictionMessages.NONE);
		});

		it('should handle lowercase country codes correctly', () => {
			const result = checkJurisdiction('de');

			// Should now match because we normalize to uppercase
			expect(result.showConsentBanner).toBe(true);
			expect(result.jurisdictionCode).toBe('GDPR');
			expect(result.message).toBe(JurisdictionMessages.GDPR);
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

				expect(result.showConsentBanner).toBe(true);
				expect(result.jurisdictionCode).toBe(expectedJurisdiction);
				expect(result.message).toBe(JurisdictionMessages[expectedJurisdiction]);
			}
		});

		it('should handle invalid country codes', () => {
			const invalidCodes = ['XX', 'ZZ', '123', 'ABC'];

			for (const code of invalidCodes) {
				const result = checkJurisdiction(code);

				expect(result.showConsentBanner).toBe(false);
				expect(result.jurisdictionCode).toBe('NONE');
				expect(result.message).toBe(JurisdictionMessages.NONE);
			}
		});
	});

	describe('Return value structure', () => {
		it('should always return an object with required properties', () => {
			const result = checkJurisdiction('DE');

			expect(result).toEqual({
				showConsentBanner: expect.any(Boolean),
				jurisdictionCode: expect.any(String),
				message: expect.any(String),
			});

			expect(result).toHaveProperty('showConsentBanner');
			expect(result).toHaveProperty('jurisdictionCode');
			expect(result).toHaveProperty('message');
		});

		it('should return consistent types regardless of input', () => {
			const inputs = ['DE', 'US', 'GB', 'XX', '', null];

			for (const input of inputs) {
				const result = checkJurisdiction(input);

				expect(typeof result.showConsentBanner).toBe('boolean');
				expect(typeof result.jurisdictionCode).toBe('string');
				expect(typeof result.message).toBe('string');
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

				expect(result.showConsentBanner).toBe(expectedShow);
				expect(result.jurisdictionCode).toBe(expectedJurisdiction);
				expect(result.message).toBe(JurisdictionMessages[expectedJurisdiction]);
			}
		});
	});
});
