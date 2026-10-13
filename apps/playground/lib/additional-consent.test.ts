import { describe, expect, it } from 'vitest';

import {
	parseProviderCsv,
	parseProviderIds,
	selectProviders,
} from './additional-consent';

// Rows as Google's published file quotes them.
const GOOGLE_CSV = [
	'"provider_id","provider_name","policy_url","domains"',
	'20,"Eacnur","https://eacnur.org/es/politica-privacidad",""',
	'89,"Meta","https://www.facebook.com/about/privacy/update","facebook.com"',
	'',
].join('\n');

describe('parseProviderCsv', () => {
	it('reads Google provider rows', () => {
		expect([...parseProviderCsv(GOOGLE_CSV).values()]).toEqual([
			{
				id: 20,
				name: 'Eacnur',
				policyUrl: 'https://eacnur.org/es/politica-privacidad',
			},
			{
				id: 89,
				name: 'Meta',
				policyUrl: 'https://www.facebook.com/about/privacy/update',
			},
		]);
	});

	it('keeps commas, escaped quotes and line breaks inside quoted names', () => {
		const csv = [
			'provider_id,provider_name,policy_url,domains',
			'1,"Acme, Inc.","https://acme.test/privacy",""',
			'2,"The ""Best"" Ads","https://best.test/privacy",""',
			'3,"Split\r\nName","https://split.test/privacy",""',
		].join('\r\n');

		expect([...parseProviderCsv(csv).values()].map(({ name }) => name)).toEqual(
			['Acme, Inc.', 'The "Best" Ads', 'Split\r\nName']
		);
	});

	it('skips rows that are not usable providers', () => {
		const csv = [
			'provider_id,provider_name,policy_url,domains',
			'0,Zero,https://zero.test/privacy,',
			'1.5,Fraction,https://fraction.test/privacy,',
			'4,,https://unnamed.test/privacy,',
			'5,Script,javascript:alert(1),',
			'6,Valid,https://valid.test/privacy,',
		].join('\n');

		expect([...parseProviderCsv(csv).keys()]).toEqual([6]);
	});

	it('returns nothing for a response that is not the provider CSV', () => {
		expect(parseProviderCsv('<html>Not found</html>').size).toBe(0);
	});
});

describe('selectProviders', () => {
	const listed = parseProviderCsv(GOOGLE_CSV);

	it('keeps the requested providers Google lists', () => {
		expect(selectProviders(listed, parseProviderIds('89, 999'))).toEqual({
			'89': {
				id: 89,
				name: 'Meta',
				policyUrl: 'https://www.facebook.com/about/privacy/update',
			},
		});
	});

	it('returns every provider without a filter', () => {
		expect(
			Object.keys(selectProviders(listed, parseProviderIds(null)))
		).toEqual(['20', '89']);
	});

	it('returns no providers for a filter with no usable IDs', () => {
		expect(selectProviders(listed, parseProviderIds('abc'))).toEqual({});
	});
});
