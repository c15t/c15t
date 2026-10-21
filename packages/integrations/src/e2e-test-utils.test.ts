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
});
