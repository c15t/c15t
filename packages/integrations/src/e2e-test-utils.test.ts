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
