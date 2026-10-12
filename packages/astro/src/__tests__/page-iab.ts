import { createLazyIABFactory } from '@c15t/core/runtime';
import { mountRuntimeIAB } from '@c15t/core/runtime/on-demand';

import type { PageIAB } from '../client';

/**
 * The IAB wiring the integration's boot script registers for a site that
 * sets `iab`. Suites that boot an IAB site without the boot script register
 * it themselves.
 *
 * @returns A fresh lazy factory and the runtime mount.
 */
export const createTestPageIAB = function createTestPageIAB(): PageIAB {
	return {
		...createLazyIABFactory(() => import('@c15t/iab')),
		mount: mountRuntimeIAB,
	};
};
