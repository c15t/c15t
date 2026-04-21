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
import { tiktokPixel } from './tiktok-pixel';

describe('tiktokPixel contract', () => {
	registerVendorContractCleanup();

	it('boots with queued consent/page calls and a post-load consent handshake', () => {
		let acknowledged = false;
		const runtimeCalls: string[] = [];
		let queueSnapshot: unknown[] = [];

		installHeadProbe((node, win) => {
			if (!node.src.includes('analytics.tiktok.com/i18n/pixel/events.js')) {
				return;
			}

			const queue = win.ttq as unknown[];
			queueSnapshot = Array.isArray(queue) ? [...queue] : [];
			acknowledged =
				win.TiktokAnalyticsObject === 'ttq' &&
				Array.isArray(queue) &&
				JSON.stringify(queueSnapshot) ===
					JSON.stringify([['grantConsent'], ['page']]);

			win.ttq = {
				grantConsent: () => {
					runtimeCalls.push('grantConsent');
				},
				page: () => {
					runtimeCalls.push('page');
				},
				revokeConsent: () => {
					runtimeCalls.push('revokeConsent');
				},
			};

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...tiktokPixel({ pixelId: 'TT-CONTRACT' }),
					id: 'tiktok-pixel-contract',
				},
			],
			grantedMarketingConsents
		);

		expect(acknowledged).toBe(true);
		expect(queueSnapshot).toEqual([['grantConsent'], ['page']]);
		expect(runtimeCalls).toEqual(['grantConsent']);
	});
});
