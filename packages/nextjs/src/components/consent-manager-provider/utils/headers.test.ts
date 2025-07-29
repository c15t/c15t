import { describe, expect, it } from 'vitest';
import { extractRelevantHeaders } from './headers';

describe('extractRelevantHeaders', () => {
	it('should extract all relevant headers when present', () => {
		const headers = new Headers();
		headers.set('cf-ipcountry', 'US');
		headers.set('x-vercel-ip-country', 'GB');
		headers.set('x-amz-cf-ipcountry', 'DE');
		headers.set('x-country-code', 'FR');
		headers.set('x-vercel-ip-country-region', 'CA-ON');
		headers.set('x-region-code', 'WEST');
		headers.set('accept-language', 'en-US,en;q=0.9');
		headers.set('user-agent', 'Mozilla/5.0');

		const result = extractRelevantHeaders(headers);

		expect(result).toEqual({
			'cf-ipcountry': 'US',
			'x-vercel-ip-country': 'GB',
			'x-amz-cf-ipcountry': 'DE',
			'x-country-code': 'FR',
			'x-vercel-ip-country-region': 'CA-ON',
			'x-region-code': 'WEST',
			'accept-language': 'en-US,en;q=0.9',
			'user-agent': 'Mozilla/5.0',
			'x-c15t-country': 'US',
			'x-c15t-region': 'CA-ON',
		});
	});

	it('should only extract headers that are present', () => {
		const headers = new Headers();
		headers.set('cf-ipcountry', 'US');
		headers.set('user-agent', 'Mozilla/5.0');
		// Other headers not set

		const result = extractRelevantHeaders(headers);

		expect(result).toEqual({
			'cf-ipcountry': 'US',
			'user-agent': 'Mozilla/5.0',
			'x-c15t-country': 'US',
		});
	});

	it('should return empty object when no relevant headers are present', () => {
		const headers = new Headers();
		headers.set('irrelevant-header', 'some-value');

		const result = extractRelevantHeaders(headers);

		expect(result).toEqual({});
	});

	it('should handle empty Headers object', () => {
		const headers = new Headers();

		const result = extractRelevantHeaders(headers);

		expect(result).toEqual({});
	});

	it('should add c15t headers when corresponding headers are present', () => {
		const headers = new Headers();

		// Country headers
		headers.set('cf-ipcountry', 'US');
		headers.set('x-vercel-ip-country', 'GB');
		headers.set('x-amz-cf-ipcountry', 'DE');
		headers.set('x-country-code', 'FR');

		// Region headers
		headers.set('x-vercel-ip-country-region', 'CA-ON');
		headers.set('x-region-code', 'WEST');

		const result = extractRelevantHeaders(headers);

		expect(result).toMatchObject({
			'x-c15t-country': 'US', // Should take the first available country header
			'x-c15t-region': 'CA-ON', // Should take the first available region header
		});

		// Test with only one country header
		const headersWithOneCountry = new Headers();
		headersWithOneCountry.set('x-country-code', 'FR');

		const resultOneCountry = extractRelevantHeaders(headersWithOneCountry);
		expect(resultOneCountry).toMatchObject({
			'x-c15t-country': 'FR',
		});

		// Test with only one region header
		const headersWithOneRegion = new Headers();
		headersWithOneRegion.set('x-region-code', 'WEST');

		const resultOneRegion = extractRelevantHeaders(headersWithOneRegion);
		expect(resultOneRegion).toMatchObject({
			'x-c15t-region': 'WEST',
		});
	});
});
