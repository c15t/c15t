import type { ConsentRuntimeIABFactoryOptions } from '@c15t/core/runtime';
import { describe, expect, it } from 'vitest';

import { lazyCreateIAB, whenIABReady } from '../browser/iab';

const factoryOptions = {
	cmpId: 42,
	kernel: {
		getSnapshot: () => ({ consents: {}, iab: null }),
		set: { iab: () => undefined },
		subscribe: () => () => undefined,
	} as never,
} satisfies ConsentRuntimeIABFactoryOptions;

/**
 * The lazy-factory mechanics live in `@c15t/core/runtime` and are covered
 * there. What matters here is the wiring: the page's factory hands back a
 * usable handle before `@c15t/iab` has loaded, and forwards to the real
 * CMP once the import settles.
 */
describe('the page IAB factory', () => {
	it('returns a usable handle before the module has loaded', async () => {
		const handle = lazyCreateIAB(factoryOptions);

		expect(typeof handle.dispose).toBe('function');
		expect(handle.setPurposeConsent).toBeUndefined();

		await whenIABReady();
		expect(handle.setPurposeConsent).toBeTypeOf('function');
		handle.dispose();
	});
});
