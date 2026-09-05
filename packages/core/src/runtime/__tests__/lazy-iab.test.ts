/**
 * `createLazyIABFactory` — the deferred `createIAB` every framework passes
 * to the runtime so `@c15t/iab` stays out of non-IAB bundles.
 */
import { describe, expect, test, vi } from 'vitest';

import { createLazyIABFactory } from '../lazy-iab';
import type { ConsentRuntimeIABHandle } from '../types';

const createHandle = function createHandle(): ConsentRuntimeIABHandle {
	return {
		acceptAll: vi.fn(),
		dispose: vi.fn(),
		generateTCString: vi.fn().mockResolvedValue(''),
		rejectAll: vi.fn(),
		save: vi.fn().mockResolvedValue(undefined),
		setPurposeConsent: vi.fn(),
		setPurposeLegitimateInterest: vi.fn(),
		setSpecialFeatureOptIn: vi.fn(),
		setVendorConsent: vi.fn(),
		setVendorLegitimateInterest: vi.fn(),
	};
};

const options = { cmpId: 42, kernel: {} as never };

describe('createLazyIABFactory', () => {
	test('does not load the module until the factory is called', async () => {
		const load = vi.fn();
		const factory = createLazyIABFactory(load as never);

		await factory.whenReady();
		expect(load).not.toHaveBeenCalled();
	});

	test('forwards calls to the real handle once the module resolves', async () => {
		const handle = createHandle();
		const createIAB = vi.fn().mockReturnValue(handle);
		const factory = createLazyIABFactory(() => Promise.resolve({ createIAB }));

		const proxy = factory.create(options);
		await factory.whenReady();

		expect(createIAB).toHaveBeenCalledWith(options);
		proxy.setPurposeConsent(1, true);
		expect(handle.setPurposeConsent).toHaveBeenCalledWith(1, true);
	});

	test('`dispose()` before the load lands never mounts the CMP', async () => {
		const handle = createHandle();
		const createIAB = vi.fn().mockReturnValue(handle);
		const factory = createLazyIABFactory(() => Promise.resolve({ createIAB }));

		const proxy = factory.create(options);
		proxy.dispose();
		await factory.whenReady();

		expect(createIAB).not.toHaveBeenCalled();
	});

	test('a failed load leaves the handle inert instead of throwing', async () => {
		const factory = createLazyIABFactory(() =>
			Promise.reject(new Error('offline'))
		);

		const proxy = factory.create(options);
		await expect(factory.whenReady()).resolves.toBeUndefined();
		expect(proxy.setVendorConsent).toBeUndefined();
		expect(() => proxy.dispose()).not.toThrow();
	});
});
