import { describe, expect, it } from 'vitest';
import { checkJurisdiction } from '../jurisdiction';

describe('checkJurisdiction', () => {
	describe('GDPR jurisdictions', () => {
		it('should identify EU countries as GDPR jurisdiction', () => {
			const euCountries = ['DE', 'FR', 'ES', 'IT'];

			for (const countryCode of euCountries) {
				const result = checkJurisdiction(countryCode);
				expect(result).toEqual({
					showConsentBanner: true,
					jurisdictionCode: 'GDPR',
					message: 'GDPR or equivalent regulations require a cookie banner.',
				});
			}
		});

		it('should identify EEA countries as GDPR jurisdiction', () => {
			const eeaCountries = ['NO', 'IS', 'LI'];

			for (const countryCode of eeaCountries) {
				const result = checkJurisdiction(countryCode);
				expect(result).toEqual({
					showConsentBanner: true,
					jurisdictionCode: 'GDPR',
					message: 'GDPR or equivalent regulations require a cookie banner.',
				});
			}
		});

		it('should identify UK as GDPR jurisdiction', () => {
			const result = checkJurisdiction('GB');
			expect(result).toEqual({
				showConsentBanner: true,
				jurisdictionCode: 'GDPR',
				message: 'GDPR or equivalent regulations require a cookie banner.',
			});
		});
	});

	describe('Other jurisdictions', () => {
		it('should identify Switzerland jurisdiction', () => {
			const result = checkJurisdiction('CH');
			expect(result).toEqual({
				showConsentBanner: true,
				jurisdictionCode: 'CH',
				message: 'Switzerland requires similar data protection measures.',
			});
		});

		it('should identify Brazil jurisdiction', () => {
			const result = checkJurisdiction('BR');
			expect(result).toEqual({
				showConsentBanner: true,
				jurisdictionCode: 'BR',
				message: "Brazil's LGPD requires consent for cookies.",
			});
		});

		it('should identify Canada jurisdiction', () => {
			const result = checkJurisdiction('CA');
			expect(result).toEqual({
				showConsentBanner: true,
				jurisdictionCode: 'PIPEDA',
				message: 'PIPEDA requires consent for data collection.',
			});
		});

		it('should identify Australia jurisdiction', () => {
			const result = checkJurisdiction('AU');
			expect(result).toEqual({
				showConsentBanner: true,
				jurisdictionCode: 'AU',
				message:
					"Australia's Privacy Act mandates transparency about data collection.",
			});
		});

		it('should identify Japan jurisdiction', () => {
			const result = checkJurisdiction('JP');
			expect(result).toEqual({
				showConsentBanner: true,
				jurisdictionCode: 'APPI',
				message: "Japan's APPI requires consent for data collection.",
			});
		});

		it('should identify South Korea jurisdiction', () => {
			const result = checkJurisdiction('KR');
			expect(result).toEqual({
				showConsentBanner: true,
				jurisdictionCode: 'PIPA',
				message: "South Korea's PIPA requires consent for data collection.",
			});
		});
	});

	describe('Edge cases', () => {
		it('should handle null country code', () => {
			const result = checkJurisdiction(null);
			expect(result).toEqual({
				showConsentBanner: true,
				jurisdictionCode: 'UNKNOWN',
				message: 'No specific requirements',
			});
		});

		it('should handle non-regulated country codes', () => {
			const result = checkJurisdiction('US');
			expect(result).toEqual({
				showConsentBanner: false,
				jurisdictionCode: 'NONE',
				message: 'No specific requirements',
			});
		});
	});
});
