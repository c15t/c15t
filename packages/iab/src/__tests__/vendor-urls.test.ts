import type { GlobalVendorList } from '@c15t/core';
import { expect, test } from 'vitest';

import { resolveIABVendorUrls } from '../headless';
import { completeGVL } from './fixtures/gvl-sample';

type Vendor = GlobalVendorList['vendors'][number];

const base = Object.values(completeGVL.vendors)[0] as Vendor;
const vendor = (patch: Partial<Vendor> & Record<string, unknown>): Vendor =>
	({ ...base, ...patch }) as Vendor;

const multilingual = vendor({
	urls: [
		{ langId: 'fr', privacy: 'https://example.com/fr' },
		{
			langId: 'en',
			legIntClaim: 'https://example.com/en/li',
			privacy: 'https://example.com/en',
		},
		{
			langId: 'de',
			legIntClaim: 'https://example.com/de/li',
			privacy: 'https://example.com/de',
		},
	],
});

test.each([
	['de', 'https://example.com/de', 'https://example.com/de/li'],
	['de-AT', 'https://example.com/de', 'https://example.com/de/li'],
	['FR', 'https://example.com/fr', 'https://example.com/en/li'],
	['es', 'https://example.com/en', 'https://example.com/en/li'],
	[undefined, 'https://example.com/en', 'https://example.com/en/li'],
])(
	'picks the %s links, falling back to English',
	(language, policyUrl, legitimateInterestUrl) => {
		expect(resolveIABVendorUrls(multilingual, language)).toEqual({
			legitimateInterestUrl,
			policyUrl,
		});
	}
);

test('uses the only language a vendor declares', () => {
	const only = vendor({
		urls: [{ langId: 'it', privacy: 'https://example.com/it' }],
	});
	expect(resolveIABVendorUrls(only, 'de')).toEqual({
		legitimateInterestUrl: null,
		policyUrl: 'https://example.com/it',
	});
});

test('reads policyUrl from vendor lists older than v3', () => {
	const legacy = vendor({ policyUrl: 'https://example.com/v2', urls: [] });
	expect(resolveIABVendorUrls(legacy, 'en').policyUrl).toBe(
		'https://example.com/v2'
	);
});

test('a vendor without links gets none', () => {
	expect(resolveIABVendorUrls(vendor({ urls: [] }), 'en')).toEqual({
		legitimateInterestUrl: null,
		policyUrl: '',
	});
});
