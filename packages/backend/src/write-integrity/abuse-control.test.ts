import { describe, expect, it, vi } from 'vitest';
import type { WriteAbuseControlContext } from '~/types';
import {
	enforceWriteAbuseControl,
	runWriteAbuseControl,
} from './abuse-control';

const context: WriteAbuseControlContext = {
	action: 'consent:create',
	domain: 'example.com',
	request: new Request('https://api.example.test/subjects'),
};

describe('runWriteAbuseControl', () => {
	it('allows writes when no hook is configured', async () => {
		await expect(runWriteAbuseControl(undefined, context)).resolves.toEqual({
			status: 'allowed',
		});
	});

	it('normalizes allow and deny decisions', async () => {
		await expect(
			runWriteAbuseControl(() => ({ allowed: true }), context)
		).resolves.toEqual({ status: 'allowed' });

		await expect(
			runWriteAbuseControl(
				() => ({
					allowed: false,
					reason: 'subject-rate-limit',
					retryAfterSeconds: 30,
				}),
				context
			)
		).resolves.toEqual({
			status: 'denied',
			reason: 'subject-rate-limit',
			retryAfterSeconds: 30,
		});
	});

	it('returns a stable error when the hook throws', async () => {
		const providerError = new Error('provider failed');

		await expect(
			runWriteAbuseControl(() => {
				throw providerError;
			}, context)
		).resolves.toEqual({ status: 'error', error: providerError });
	});

	it('rejects malformed runtime decisions', async () => {
		const invalidHook = vi.fn(() => ({
			allowed: false,
			retryAfterSeconds: -1,
		}));

		const result = await runWriteAbuseControl(invalidHook, context);
		expect(result.status).toBe('error');
	});
});

describe('enforceWriteAbuseControl', () => {
	it('throws a retry-aware 429 for denied writes', async () => {
		await expect(
			enforceWriteAbuseControl(
				() => ({ allowed: false, retryAfterSeconds: 15 }),
				context
			)
		).rejects.toMatchObject({
			status: 429,
			code: 'WRITE_ABUSE_CONTROL_DENIED',
			retryAfterSeconds: 15,
		});
	});

	it('fails closed with a stable 503 when the hook fails', async () => {
		await expect(
			enforceWriteAbuseControl(() => {
				throw new Error('provider failed');
			}, context)
		).rejects.toMatchObject({
			status: 503,
			code: 'WRITE_ABUSE_CONTROL_UNAVAILABLE',
		});
	});
});
