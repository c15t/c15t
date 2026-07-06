import { describe, expect, it } from 'vitest';
import {
	extractConsentRequestInputs,
	getRegionFromHeaders,
	parseGlobalPrivacyControl,
} from './geo-headers';

describe('getRegionFromHeaders', () => {
	it('reads x-c15t-country and x-c15t-region', () => {
		expect(
			getRegionFromHeaders({
				'x-c15t-country': 'DE',
				'x-c15t-region': 'BE',
			})
		).toEqual({ country: 'DE', region: 'BE' });
	});

	it('falls back to cf-ipcountry', () => {
		expect(getRegionFromHeaders({ 'cf-ipcountry': 'FR' })).toEqual({
			country: 'FR',
		});
	});

	it('prioritizes x-c15t-country over cf-ipcountry', () => {
		expect(
			getRegionFromHeaders({
				'x-c15t-country': 'DE',
				'cf-ipcountry': 'FR',
			})
		).toEqual({ country: 'DE' });
	});

	it('returns empty object when no geo headers are present', () => {
		expect(getRegionFromHeaders({})).toEqual({});
	});
});

describe('extractConsentRequestInputs', () => {
	it('x-c15t-* overrides always beat infrastructure headers', () => {
		const headers = new Headers({
			'x-c15t-country': 'DE',
			'x-c15t-region': 'BE',
			'cf-ipcountry': 'FR',
			'x-vercel-ip-country': 'US',
			'x-vercel-ip-country-region': 'CA',
			'cf-region-code': 'IDF',
		});
		const inputs = extractConsentRequestInputs(headers);
		expect(inputs.country).toBe('DE');
		expect(inputs.region).toBe('BE');
	});

	it('resolves infra precedence cloudflare → vercel → cloudfront → generic', () => {
		expect(
			extractConsentRequestInputs(
				new Headers({ 'x-vercel-ip-country': 'US', 'cf-ipcountry': 'FR' })
			).country
		).toBe('FR');
		expect(
			extractConsentRequestInputs(
				new Headers({ 'x-country': 'GB', 'x-amz-cf-ipcountry': 'BR' })
			).country
		).toBe('BR');
	});

	it('accepts plain header records (lowercase keys)', () => {
		const inputs = extractConsentRequestInputs({
			'x-c15t-country': 'NL',
			'sec-gpc': '1',
		});
		expect(inputs.country).toBe('NL');
		expect(inputs.gpc).toBe(true);
	});

	it('negotiates language with q-values and returns the primary subtag', () => {
		const inputs = extractConsentRequestInputs(
			new Headers({ 'accept-language': 'en;q=0.1, de-DE;q=0.9' })
		);
		expect(inputs.language).toBe('de');
	});

	it('parses sec-gpc strictly', () => {
		expect(parseGlobalPrivacyControl('1')).toBe(true);
		expect(parseGlobalPrivacyControl('0')).toBe(false);
		expect(parseGlobalPrivacyControl('yes')).toBeUndefined();
		expect(parseGlobalPrivacyControl(null)).toBeUndefined();
	});

	it('caller overrides beat everything', () => {
		const inputs = extractConsentRequestInputs(
			new Headers({ 'x-c15t-country': 'DE' }),
			{ country: 'JP' }
		);
		expect(inputs.country).toBe('JP');
	});
});
