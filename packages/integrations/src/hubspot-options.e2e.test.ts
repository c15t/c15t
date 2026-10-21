/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	grantedMarketingConsents,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { hubspot } from './vendors/analytics/hubspot';
import type { HubSpotOptions } from './vendors/analytics/hubspot';

describe('HubSpot loader configuration', () => {
	registerVendorContractCleanup();

	it('runs its consent controller in the browser before the remote loader', () => {
		expect(hubspot({ portalId: 53 })).toMatchObject({
			callbackOnly: true,
			observeConsentBeforeLoad: true,
			serverStart: undefined,
		});
	});
	afterEach(() => {
		for (const key of [
			'_hsp',
			'_hsq',
			'disableHubSpotCookieBanner',
			'hsConversationsSettings',
		]) {
			Reflect.deleteProperty(window, key);
		}
	});

	it.each<{ options: HubSpotOptions; url: string }>([
		{ options: { portalId: 53 }, url: 'https://js.hs-scripts.com/53.js' },
		{
			options: { portalId: ' 53 ', region: 'eu1' },
			url: 'https://js-eu1.hs-scripts.com/53.js',
		},
		{
			options: { portalId: '53', region: 'na2' },
			url: 'https://js-na2.hs-scripts.com/53.js',
		},
		{
			options: { portalId: '53', region: 'ap1', scriptUrl: '  ' },
			url: 'https://js-ap1.hs-scripts.com/53.js',
		},
		{
			options: {
				portalId: '53',
				region: 'eu1',
				scriptUrl: ' https://cdn.example.com/hubspot.js ',
			},
			url: 'https://cdn.example.com/hubspot.js',
		},
	])(
		'inserts the resolved URL $url with a saved marketing grant',
		({ options, url }) => {
			loadScripts(
				[hubspot({ ...options, nonce: 'page-nonce' })],
				grantedMarketingConsents
			);
			const element = document.getElementById('hs-script-loader');
			expect(element).toBeInstanceOf(HTMLScriptElement);
			expect(element).toMatchObject({
				async: true,
				defer: true,
				nonce: 'page-nonce',
				src: url,
			});
		}
	);

	it.each(['EU1', '../eu1', '//example.com', 'eu1.example.com'])(
		'rejects invalid region %j and uses the default host',
		(region) => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			loadScripts(
				[hubspot({ portalId: '53', region })],
				grantedMarketingConsents
			);
			expect(error).toHaveBeenCalledWith(
				'hubspot: invalid region. Using https://js.hs-scripts.com.'
			);
			expect(document.querySelector('script')?.src).toBe(
				'https://js.hs-scripts.com/53.js'
			);
		}
	);

	it.each([
		'abc',
		'53/path',
		'-53',
		'53.5',
		Number.NaN,
		Number.POSITIVE_INFINITY,
	])('never inserts a loader for invalid portal ID %j', (portalId) => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		loadScripts([hubspot({ portalId })], grantedMarketingConsents);
		expect(error).toHaveBeenCalledWith(
			'hubspot: missing or invalid portalId. The script will not load.'
		);
		expect(document.querySelector('script')).toBeNull();
		expect(window._hsp).toBeUndefined();
	});
});
