import { baseTranslations } from '@c15t/translations';
import { describe, expect, it } from 'vitest';
import { checkJurisdiction, showBanner } from './show-banner';
import type { SupportedLanguage } from './show-banner';

describe('showBanner', () => {
	it('should handle empty headers', () => {
		const result = showBanner({});
		expect(result).toEqual({
			showConsentBanner: true,
			jurisdiction: {
				code: 'NONE',
				message: 'No specific requirements',
			},
			location: {
				countryCode: null,
				regionCode: null,
			},
			translations: {
				translations: baseTranslations.en,
				language: 'en',
			},
		});
	});

	it('should detect GDPR jurisdiction from EU country', () => {
		const result = showBanner({
			'cf-ipcountry': 'FR',
			'accept-language': 'en-US,en;q=0.9',
		});
		expect(result.jurisdiction.code).toBe('GDPR');
		expect(result.jurisdiction.message).toContain('GDPR');
		expect(result.location.countryCode).toBe('FR');
	});

	it('should detect GDPR jurisdiction from EEA country', () => {
		const result = showBanner({
			'cf-ipcountry': 'NO',
			'accept-language': 'en-US,en;q=0.9',
		});
		expect(result.jurisdiction.code).toBe('GDPR');
	});

	it('should detect GDPR jurisdiction from UK', () => {
		const result = showBanner({
			'cf-ipcountry': 'GB',
			'accept-language': 'en-US,en;q=0.9',
		});
		expect(result.jurisdiction.code).toBe('GDPR');
	});

	it('should detect CH jurisdiction', () => {
		const result = showBanner({
			'cf-ipcountry': 'CH',
			'accept-language': 'en-US,en;q=0.9',
		});
		expect(result.jurisdiction.code).toBe('CH');
		expect(result.jurisdiction.message).toContain('Switzerland');
	});

	it('should detect BR jurisdiction', () => {
		const result = showBanner({
			'cf-ipcountry': 'BR',
			'accept-language': 'en-US,en;q=0.9',
		});
		expect(result.jurisdiction.code).toBe('BR');
		expect(result.jurisdiction.message).toContain('LGPD');
	});

	it('should detect PIPEDA jurisdiction', () => {
		const result = showBanner({
			'cf-ipcountry': 'CA',
			'accept-language': 'en-US,en;q=0.9',
		});
		expect(result.jurisdiction.code).toBe('PIPEDA');
		expect(result.jurisdiction.message).toContain('PIPEDA');
	});

	it('should detect AU jurisdiction', () => {
		const result = showBanner({
			'cf-ipcountry': 'AU',
			'accept-language': 'en-US,en;q=0.9',
		});
		expect(result.jurisdiction.code).toBe('AU');
		expect(result.jurisdiction.message).toContain('Australia');
	});

	it('should detect APPI jurisdiction', () => {
		const result = showBanner({
			'cf-ipcountry': 'JP',
			'accept-language': 'en-US,en;q=0.9',
		});
		expect(result.jurisdiction.code).toBe('APPI');
		expect(result.jurisdiction.message).toContain('APPI');
	});

	it('should detect PIPA jurisdiction', () => {
		const result = showBanner({
			'cf-ipcountry': 'KR',
			'accept-language': 'en-US,en;q=0.9',
		});
		expect(result.jurisdiction.code).toBe('PIPA');
		expect(result.jurisdiction.message).toContain('PIPA');
	});

	it('should handle different header sources for country code', () => {
		const testCases = [
			{ header: 'cf-ipcountry', value: 'FR' },
			{ header: 'x-vercel-ip-country', value: 'FR' },
			{ header: 'x-amz-cf-ipcountry', value: 'FR' },
			{ header: 'x-country-code', value: 'FR' },
		];

		for (const { header, value } of testCases) {
			const result = showBanner({ [header]: value });
			expect(result.location.countryCode).toBe(value);
			expect(result.jurisdiction.code).toBe('GDPR');
		}
	});

	it('should handle different header sources for region code', () => {
		const testCases = [
			{ header: 'x-vercel-ip-country-region', value: 'IDF' },
			{ header: 'x-region-code', value: 'IDF' },
		];

		for (const { header, value } of testCases) {
			const result = showBanner({ [header]: value });
			expect(result.location.regionCode).toBe(value);
		}
	});

	it('should handle language preferences correctly', () => {
		const testCases: Array<{
			acceptLanguage: string | null;
			expected: SupportedLanguage;
		}> = [
			{ acceptLanguage: 'fr-FR,fr;q=0.9,en;q=0.8', expected: 'fr' },
			{ acceptLanguage: 'de-DE,de;q=0.9,en;q=0.8', expected: 'de' },
			{ acceptLanguage: 'es-ES,es;q=0.9,en;q=0.8', expected: 'es' },
			{ acceptLanguage: 'invalid-language', expected: 'en' },
			{ acceptLanguage: null, expected: 'en' },
		];

		for (const { acceptLanguage, expected } of testCases) {
			const result = showBanner({
				'accept-language': acceptLanguage ?? '',
				'cf-ipcountry': 'FR',
			});
			expect(result.translations.language).toBe(expected);
			expect(result.translations.translations).toBe(
				baseTranslations[expected as keyof typeof baseTranslations]
			);
		}
	});
});

describe('checkJurisdiction', () => {
	it('should return NONE for unknown country codes', () => {
		const result = checkJurisdiction('XX');
		expect(result.jurisdictionCode).toBe('NONE');
		expect(result.message).toBe('No specific requirements');
	});

	it('should return NONE for null country code', () => {
		const result = checkJurisdiction(null);
		expect(result.jurisdictionCode).toBe('NONE');
		expect(result.message).toBe('No specific requirements');
	});

	it('should always return showConsentBanner as true', () => {
		const result = checkJurisdiction('FR');
		expect(result.showConsentBanner).toBe(true);
	});
});
