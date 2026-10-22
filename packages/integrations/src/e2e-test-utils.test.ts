/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';

import {
	clearAllScripts,
	grantedMarketingConsents,
	loadScripts,
	registerVendorContractCleanup,
	resetVendorGlobals,
} from './e2e-test-utils';
import { liveIntentTag } from './vendors/ads-and-pixels/liveintent';
import { theTradeDeskPixel } from './vendors/ads-and-pixels/the-trade-desk';

describe('vendor contract cleanup', () => {
	registerVendorContractCleanup();

	it('removes the Trade Desk bootstrap globals', () => {
		loadScripts(
			[theTradeDeskPixel({ advertiserId: 'c15tfake', pixelIds: ['c15tfake'] })],
			grantedMarketingConsents
		);
		expect(window.ttdConversionEvents).toBeTypeOf('function');
		expect(window.ttdConversionEventsLayer).toHaveLength(2);

		clearAllScripts();
		resetVendorGlobals();

		expect.soft('ttdConversionEvents' in window).toBe(false);
		expect.soft('ttdConversionEventsLayer' in window).toBe(false);
	});

	it('removes the LiveIntent bootstrap and SDK configuration', () => {
		loadScripts(
			[liveIntentTag({ tagId: 'c15t-tag' })],
			grantedMarketingConsents
		);
		expect(window.liQ).toEqual([]);
		window.LI = { appId: 'c15t-tag' };

		clearAllScripts();
		resetVendorGlobals();

		expect.soft('LI' in window).toBe(false);
		expect.soft('liQ' in window).toBe(false);
	});
});
/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';

import {
	grantedMarketingConsents,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { vector } from './vendors/ads-and-pixels/vector';

describe('vendor contract cleanup', () => {
	afterEach(() => {
		for (const name of ['vector', '__vector_manager']) {
			expect(name in window, `${name} survives shared cleanup`).toBe(false);
		}
	});

	describe('after Vector bootstrap', () => {
		registerVendorContractCleanup();

		it('removes the bootstrap and SDK manager globals', () => {
			loadScripts(
				[vector({ pixelId: 'cleanup-test-pixel' })],
				grantedMarketingConsents
			);
			expect(window).toHaveProperty('vector.q', [
				['load', ['cleanup-test-pixel']],
			]);
			Reflect.set(window, '__vector_manager', { instances: new Map() });
		});
	});
});
