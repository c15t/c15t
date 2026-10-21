/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
	grantedMarketingConsents,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { liveIntentTag } from './vendors/ads-and-pixels/liveintent';

describe('vendor contract cleanup', () => {
	afterEach(() => {
		expect({ LI: window.LI, liQ: window.liQ }).toEqual({
			LI: undefined,
			liQ: undefined,
		});
	});

	describe('LiveIntent globals', () => {
		registerVendorContractCleanup();

		it('clears the manifest bootstrap and SDK configuration', () => {
			loadScripts(
				[liveIntentTag({ tagId: 'c15t-tag' })],
				grantedMarketingConsents
			);
			expect(window.liQ).toEqual([]);
			window.LI = { appId: 'c15t-tag' };
		});
	});
});
