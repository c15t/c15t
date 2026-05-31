/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	grantedMarketingConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { redditPixel } from './vendors/ads-and-pixels/reddit-pixel';
import { snapchatPixel } from './vendors/ads-and-pixels/snapchat-pixel';

describe('ads pixel queue contracts', () => {
	registerVendorContractCleanup();

	it('boots Reddit Pixel queue before append', () => {
		let queueSnapshot: unknown[][] | undefined;
		let scriptSrc: string | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('redditstatic.com/ads/pixel.js')) {
				return;
			}

			win.rdt?.('track', 'Purchase', { currency: 'USD', valueDecimal: 49 });
			queueSnapshot = win.rdt?.callQueue?.map((entry) => [...entry]);
			scriptSrc = node.src;
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...redditPixel({
						disableFirstPartyCookies: true,
						initOptions: { email: 'hash@example.com' },
						pixelId: 'REDDIT-CONTRACT',
					}),
					id: 'reddit-pixel-contract',
				},
			],
			grantedMarketingConsents
		);

		expect(scriptSrc).toContain('/ads/pixel.js');
		expect(queueSnapshot).toEqual([
			[
				'init',
				'REDDIT-CONTRACT',
				{
					disableFirstPartyCookies: true,
					email: 'hash@example.com',
				},
			],
			['track', 'PageVisit'],
			['track', 'Purchase', { currency: 'USD', valueDecimal: 49 }],
		]);
	});

	it('boots Snapchat Pixel metadata, alias, and queue before append', () => {
		let aliasMatches: boolean | undefined;
		let pushMatches: boolean | undefined;
		let queueSnapshot: unknown[][] | undefined;
		let scriptSrc: string | undefined;
		let stubMetadata: Record<string, unknown> | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('sc-static.net/scevent.min.js')) {
				return;
			}

			win.snaptr?.('track', 'SIGN_UP', { sign_up_method: 'email' });
			aliasMatches = win._snaptr === win.snaptr;
			pushMatches = win.snaptr?.push === win.snaptr;
			queueSnapshot = win.snaptr?.queue?.map((entry) => [...entry]);
			scriptSrc = node.src;
			stubMetadata = {
				loaded: win.snaptr?.loaded,
				version: win.snaptr?.version,
			};
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...snapchatPixel({
						initOptions: { user_email: 'hash@example.com' },
						pixelId: 'SNAPCHAT-CONTRACT',
					}),
					id: 'snapchat-pixel-contract',
				},
			],
			grantedMarketingConsents
		);

		expect(scriptSrc).toContain('/scevent.min.js');
		expect(aliasMatches).toBe(true);
		expect(pushMatches).toBe(true);
		expect(stubMetadata).toEqual({
			loaded: true,
			version: '1.0',
		});
		expect(queueSnapshot).toEqual([
			[
				'init',
				'SNAPCHAT-CONTRACT',
				{
					user_email: 'hash@example.com',
				},
			],
			['track', 'PAGE_VIEW'],
			['track', 'SIGN_UP', { sign_up_method: 'email' }],
		]);
	});
});
