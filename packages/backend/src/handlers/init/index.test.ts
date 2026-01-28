import { baseTranslations } from '@c15t/translations';
import { describe, expect, it } from 'vitest';
import type { C15TOptions } from '~/types';
import { checkJurisdiction, getJurisdiction, getLocation } from './geo';
import {
	buildResponse,
	getHeaders,
	getTranslationsData,
	parseAcceptLanguage,
} from './index';

describe('Init Handler Utilities', () => {
	describe('getHeaders', () => {
		it('extracts country code from cf-ipcountry header', () => {
			const headers = new Headers({ 'cf-ipcountry': 'DE' });
			const result = getHeaders(headers);
			expect(result.countryCode).toBe('DE');
		});

		it('falls back to alternative country code headers', () => {
			const headers = new Headers({ 'x-vercel-ip-country': 'FR' });
			const result = getHeaders(headers);
			expect(result.countryCode).toBe('FR');
		});

		it('prioritizes cf-ipcountry over other headers', () => {
			const headers = new Headers({
				'cf-ipcountry': 'DE',
				'x-vercel-ip-country': 'FR',
			});
			const result = getHeaders(headers);
			expect(result.countryCode).toBe('DE');
		});

		it('extracts region code from headers', () => {
			const headers = new Headers({
				'cf-ipcountry': 'US',
				'x-vercel-ip-country-region': 'CA',
			});
			const result = getHeaders(headers);
			expect(result.countryCode).toBe('US');
			expect(result.regionCode).toBe('CA');
		});

		it('handles missing headers gracefully', () => {
			const headers = new Headers({});
			const result = getHeaders(headers);
			expect(result.countryCode).toBeNull();
			expect(result.regionCode).toBeNull();
		});

		it('handles undefined headers', () => {
			const result = getHeaders(undefined);
			expect(result.countryCode).toBeNull();
			expect(result.regionCode).toBeNull();
			expect(result.acceptLanguage).toBeNull();
		});
	});

	describe('checkJurisdiction', () => {
		it('returns GDPR for EU countries', () => {
			expect(checkJurisdiction('DE', null)).toBe('GDPR');
			expect(checkJurisdiction('FR', null)).toBe('GDPR');
			expect(checkJurisdiction('IT', null)).toBe('GDPR');
		});

		it('returns UK_GDPR for UK', () => {
			expect(checkJurisdiction('GB', null)).toBe('UK_GDPR');
		});

		it('returns CCPA for California', () => {
			expect(checkJurisdiction('US', 'CA')).toBe('CCPA');
		});

		it('returns NONE for non-regulated regions', () => {
			expect(checkJurisdiction('US', null)).toBe('NONE');
			expect(checkJurisdiction('US', 'TX')).toBe('NONE');
		});

		it('returns PIPEDA for Canada', () => {
			expect(checkJurisdiction('CA', null)).toBe('PIPEDA');
		});

		it('returns CH for Switzerland', () => {
			expect(checkJurisdiction('CH', null)).toBe('CH');
		});

		it('handles null country code', () => {
			expect(checkJurisdiction(null, null)).toBe('NONE');
		});
	});

	describe('parseAcceptLanguage', () => {
		it('returns en for null input', () => {
			expect(parseAcceptLanguage(null)).toBe('en');
		});

		it('parses simple language code', () => {
			expect(parseAcceptLanguage('de')).toBe('de');
		});

		it('parses language with region', () => {
			expect(parseAcceptLanguage('de-DE')).toBe('de');
		});

		it('parses Accept-Language with quality factors', () => {
			expect(parseAcceptLanguage('de-DE,de;q=0.9,en;q=0.8')).toBe('de');
		});
	});

	describe('getTranslationsData', () => {
		it('returns en translations for null Accept-Language', () => {
			const result = getTranslationsData(null);
			expect(result.language).toBe('en');
			expect(result.translations.cookieBanner.title).toBe(
				baseTranslations.en.cookieBanner.title
			);
		});

		it('returns de translations for de-DE', () => {
			const result = getTranslationsData('de-DE,de;q=0.9,en;q=0.8');
			expect(result.language).toBe('de');
			expect(result.translations.cookieBanner.title).toBe(
				baseTranslations.de.cookieBanner.title
			);
		});

		it('merges custom translations', () => {
			const customTranslations = {
				en: { cookieBanner: { title: 'Custom Title' } },
			};
			const result = getTranslationsData('en-US', customTranslations);
			expect(result.translations.cookieBanner.title).toBe('Custom Title');
		});
	});

	describe('buildResponse', () => {
		it('returns properly structured response', () => {
			const result = buildResponse({
				jurisdiction: 'GDPR',
				location: { countryCode: 'DE', regionCode: null },
				acceptLanguage: 'en',
				customTranslations: undefined,
				branding: 'c15t',
			});

			expect(result).toHaveProperty('jurisdiction');
			expect(result).toHaveProperty('location');
			expect(result).toHaveProperty('translations');
			expect(result).toHaveProperty('branding');
			expect(result.jurisdiction).toBe('GDPR');
			expect(result.branding).toBe('c15t');
		});
	});

	describe('getLocation', () => {
		it('returns null location when geo is disabled', async () => {
			const request = new Request('http://localhost', {
				headers: { 'cf-ipcountry': 'DE' },
			});
			const options: C15TOptions = {
				trustedOrigins: [],
				adapter: {} as C15TOptions['adapter'],
				advanced: { disableGeoLocation: true },
			};

			const result = await getLocation(request, options);
			expect(result.countryCode).toBeNull();
			expect(result.regionCode).toBeNull();
		});
	});

	describe('getJurisdiction', () => {
		it('returns GDPR when geo is disabled', () => {
			const options: C15TOptions = {
				trustedOrigins: [],
				adapter: {} as C15TOptions['adapter'],
				advanced: { disableGeoLocation: true },
			};

			const result = getJurisdiction(
				{ countryCode: 'US', regionCode: null },
				options
			);
			expect(result).toBe('GDPR');
		});

		it('returns appropriate jurisdiction based on location', () => {
			const options: C15TOptions = {
				trustedOrigins: [],
				adapter: {} as C15TOptions['adapter'],
			};

			expect(
				getJurisdiction({ countryCode: 'DE', regionCode: null }, options)
			).toBe('GDPR');
			expect(
				getJurisdiction({ countryCode: 'US', regionCode: 'CA' }, options)
			).toBe('CCPA');
			expect(
				getJurisdiction({ countryCode: 'GB', regionCode: null }, options)
			).toBe('UK_GDPR');
		});
	});
});
