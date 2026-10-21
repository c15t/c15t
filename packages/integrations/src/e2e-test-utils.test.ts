/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerVendorContractCleanup } from './e2e-test-utils';

describe('vendor contract cleanup', () => {
	afterEach(() => {
		expect(window._elqQ).toBeUndefined();
	});
	registerVendorContractCleanup();

	const commands: unknown[][] = [];
	const queues = [commands, { push: vi.fn() }];
	it.each(queues)(
		'removes the Eloqua queue or dispatcher after a test',
		(queue) => {
			window._elqQ = queue;
			expect(window._elqQ).toBe(queue);
		}
	);
});
