import { describe, expect, it, vi } from 'vitest';
import { ErrorHandler, executeWithRetry } from '../src/utils/errors';

vi.mock('@actions/core');

describe('Error utilities', () => {
	it('maps Vercel project not found', () => {
		const err = ErrorHandler.handleVercel(new Error('Project not found'));
		expect(err.type).toBe('configuration');
		expect(err.retryable).toBe(false);
	});

	it('maps API rate limit', () => {
		const err = ErrorHandler.handleVercel(new Error('Rate limit exceeded'));
		expect(err.type).toBe('api_limit');
		expect(err.retryable).toBe(true);
	});

	it('retries transient errors and eventually succeeds (no real sleep)', async () => {
		const op = vi
			.fn()
			.mockRejectedValueOnce(new Error('transient'))
			.mockRejectedValueOnce(new Error('still transient'))
			.mockResolvedValueOnce('ok');

		const res = await executeWithRetry(() => op(), ErrorHandler.handleVercel, {
			maxRetries: 3,
			backoffBaseMs: 0,
			maxDelayMs: 0,
			sleep: async () => {},
		});
		expect(res).toBe('ok');
		expect(op).toHaveBeenCalledTimes(3);
	});

	it('stops retrying on non-retryable errors', async () => {
		const op = vi.fn().mockRejectedValue(new Error('Project not found'));
		await expect(
			executeWithRetry(() => op(), ErrorHandler.handleVercel, 3)
		).rejects.toThrow('Project not found');
		expect(op).toHaveBeenCalledTimes(1);
	});
});
