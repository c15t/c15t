import { describe, expect, it } from 'vitest';
import { getRegionFromHeaders } from './geo-headers';

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
