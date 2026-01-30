import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_CHECK_PATH, checkConsent } from '../../endpoints/consent';
import type { FetcherContext } from '../../fetcher';

describe('Consent Endpoints', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	const context: FetcherContext = {
		baseUrl: 'https://api.example.com',
		headers: {},
		retryConfig: {},
	};

	it('should have correct path', () => {
		expect(CONSENT_CHECK_PATH).toBe('/consents/check');
	});

	describe('checkConsent', () => {
		it('should check consent with GET method and query params', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						results: {
							analytics: { hasConsent: true, isLatestPolicy: true },
						},
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const result = await checkConsent(context, {
				externalId: 'user_123',
				type: 'analytics',
			});

			expect(result.ok).toBe(true);
			expect(result.data?.results).toBeDefined();

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('/consents/check');
			expect(fetchCall[0]).toContain('externalId=user_123');
			expect(fetchCall[1].method).toBe('GET');
		});

		it('should handle no consent found', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						results: {},
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const result = await checkConsent(context, {
				externalId: 'unknown_user',
				type: 'analytics',
			});

			expect(result.ok).toBe(true);
		});

		it('should pass type filter', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						results: { analytics: { hasConsent: true, isLatestPolicy: true } },
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			await checkConsent(context, {
				externalId: 'user_123',
				type: 'analytics',
			});

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('type=analytics');
		});

		it('should handle authentication errors', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Unauthorized' }), {
					status: 401,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const result = await checkConsent(context, {
				externalId: 'user_123',
				type: 'analytics',
			});

			expect(result.ok).toBe(false);
			expect(result.error?.status).toBe(401);
		});
	});
});
