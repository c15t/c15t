import type { ConsentRuntimeIABFactoryOptions } from '@c15t/core/runtime';
import { describe, expect, it, vi } from 'vitest';

import { createLazyIABLoader } from '../browser/iab';

const factoryOptions = {
	cmpId: 42,
	kernel: {} as never,
} satisfies ConsentRuntimeIABFactoryOptions;

const setup = function setup() {
	const acceptAll = vi.fn();
	const dispose = vi.fn();
	const createIAB = vi.fn(() => ({ acceptAll, dispose }) as never);
	const loader = createLazyIABLoader(() => Promise.resolve({ createIAB }));
	return { acceptAll, createIAB, dispose, loader };
};

/**
 * The runtime calls `createIAB` synchronously, but `@c15t/iab` is loaded on
 * demand so the TCF implementation stays out of the boot chunk of every
 * page. These cover the window that opens between the two.
 */
describe('createLazyIABLoader', () => {
	it('returns a usable handle before the module has loaded', () => {
		const { createIAB, loader } = setup();
		const handle = loader.create(factoryOptions);

		expect(typeof handle.dispose).toBe('function');
		expect(createIAB).not.toHaveBeenCalled();
	});

	it('forwards calls to the real handle once it lands', async () => {
		const { acceptAll, createIAB, loader } = setup();
		const handle = loader.create(factoryOptions);
		await loader.whenReady();

		expect(createIAB).toHaveBeenCalledWith(factoryOptions);
		handle.acceptAll();
		expect(acceptAll).toHaveBeenCalledOnce();
	});

	it('disposes the real handle', async () => {
		const { dispose, loader } = setup();
		const handle = loader.create(factoryOptions);
		await loader.whenReady();
		handle.dispose();

		expect(dispose).toHaveBeenCalledOnce();
	});

	it('never constructs a CMP that was disposed while loading', async () => {
		const { createIAB, loader } = setup();
		const handle = loader.create(factoryOptions);
		// Dispose before the load can settle.
		handle.dispose();
		await loader.whenReady();

		expect(createIAB).not.toHaveBeenCalled();
	});

	it('leaves IAB inert when the module fails to load', async () => {
		const loader = createLazyIABLoader(() =>
			Promise.reject(new Error('offline'))
		);
		const handle = loader.create(factoryOptions);

		await expect(loader.whenReady()).resolves.toBeUndefined();
		expect(() => handle.dispose()).not.toThrow();
	});
});
