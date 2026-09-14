import type { GlobalVendorList } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import { resolveIABBannerSummary } from '../libs/iab-banner-summary';
import {
	createGvlReferenceURL,
	deferInitGvl,
	serveGvlReference,
} from '../transports/gvl-reference';

const gvl = {
	purposes: {},
	vendorListVersion: 42,
	vendors: {},
} as GlobalVendorList;

describe('versioned public vendor list route', () => {
	test.each(['de', 'DE-DE'])(
		'returns a list for normalized language %s',
		async (language) => {
			const load = vi.fn().mockResolvedValue(gvl);
			const url = createGvlReferenceURL('/privacy/init', gvl, language);
			const response = await serveGvlReference(
				new Request(`https://app.test${url}`),
				load
			);
			expect(await response?.json()).toEqual(gvl);
			expect(load).toHaveBeenCalledWith('de');
			expect(response?.headers.get('cache-control')).toBe(
				'public, max-age=86400'
			);
		}
	);
	test.each(['?c15t-gvl=wrong', '?c15t-gvl=42&language=../en'])(
		'rejects invalid parameters %s',
		async (query) => {
			const load = vi.fn();
			expect(
				(
					await serveGvlReference(
						new Request(`https://app.test/init${query}`),
						load
					)
				)?.status
			).toBe(400);
			expect(load).not.toHaveBeenCalled();
		}
	);
	test('never caches a different version under the requested version', async () => {
		const response = await serveGvlReference(
			new Request('https://app.test/init?c15t-gvl=41'),
			() => Promise.resolve(gvl)
		);
		expect(response?.status).toBe(409);
		expect(response?.headers.get('cache-control')).toBe('no-store');
	});
	test('does not handle an ordinary init request', async () => {
		const load = vi.fn();
		expect(
			await serveGvlReference(new Request('https://app.test/init'), load)
		).toBeNull();
		expect(load).not.toHaveBeenCalled();
	});
});

test('hosted references preserve policy inputs without request credentials', () => {
	const deferred = deferInitGvl(
		{
			gvl,
			location: { countryCode: 'DE', regionCode: 'BE' },
			translations: { language: 'DE-DE' },
		},
		'/init',
		'init',
		{
			authorization: 'Bearer private',
			cookie: 'session=private',
			'sec-gpc': '1',
			'x-vercel-ip-country': 'US',
		}
	);
	expect(deferred.gvlReference).toMatchObject({
		context: { country: 'DE', gpc: true, region: 'BE' },
		language: 'de',
	});
	expect(JSON.stringify(deferred)).not.toContain('private');
});

test.each([undefined, false, true])(
	'preserves optional GPC %s through hosted deferral',
	(gpc) => {
		const result = deferInitGvl(
			{ gvl, resolvedPrivacySignals: { gpc } },
			'/init',
			'init'
		);
		expect(result.gvlReference?.context?.gpc).toBe(gpc);
	}
);
test('counts custom vendors once before and after list deferral', () => {
	const input = {
		customVendors: [
			{ id: 'custom', legIntPurposes: [], name: 'Custom vendor', purposes: [] },
		],
		gvl,
	};
	const deferred = deferInitGvl(input, '/list');
	expect(deferred.gvlReference?.summary?.vendorCount).toBe(0);
	expect(resolveIABBannerSummary({ ...deferred, gvl: null })).toEqual(
		resolveIABBannerSummary(input)
	);
	expect(resolveIABBannerSummary({ ...deferred, gvl: null }).vendorCount).toBe(
		1
	);
});
