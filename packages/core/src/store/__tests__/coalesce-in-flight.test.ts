import { describe, expect, it, vi } from 'vitest';

import { coalesceInFlight } from '../coalesce-in-flight';

describe('coalesceInFlight', () => {
	it('returns the same request for the same in-flight key', async () => {
		const requests = new Map<string, Promise<string>>();
		const createRequest = vi.fn(() => 'result');

		const first = coalesceInFlight(requests, 'same', createRequest);
		const second = coalesceInFlight(requests, 'same', createRequest);

		expect(second).toBe(first);
		await expect(first).resolves.toBe('result');
		expect(createRequest).toHaveBeenCalledTimes(1);
	});

	it('does not coalesce different keys', async () => {
		const requests = new Map<string, Promise<string>>();
		const createRequest = vi.fn(() => 'result');

		const first = coalesceInFlight(requests, 'first', createRequest);
		const second = coalesceInFlight(requests, 'second', createRequest);

		expect(second).not.toBe(first);
		await Promise.all([first, second]);
		expect(createRequest).toHaveBeenCalledTimes(2);
	});

	it('evicts a failed request so the operation can be retried', async () => {
		const requests = new Map<string, Promise<string>>();
		const createRequest = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error('temporary failure'))
			.mockResolvedValueOnce('recovered');

		await expect(
			coalesceInFlight(requests, 'retryable', createRequest)
		).rejects.toThrow('temporary failure');

		await expect(
			coalesceInFlight(requests, 'retryable', createRequest)
		).resolves.toBe('recovered');
		expect(createRequest).toHaveBeenCalledTimes(2);
	});
});
