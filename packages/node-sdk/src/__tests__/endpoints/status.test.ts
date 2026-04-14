import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STATUS_PATH, status } from '../../endpoints/status';
import type { FetcherContext } from '../../fetcher';

describe('Status Endpoint', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('should have correct path', () => {
		expect(STATUS_PATH).toBe('/status');
	});

	it('should call status endpoint with GET method', async () => {
		const context: FetcherContext = {
			baseUrl: 'https://api.example.com',
			headers: {},
			retryConfig: {},
		};

		const mockFetch = vi.fn().mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					version: '1.0.0',
					timestamp: new Date().toISOString(),
					client: {
						ip: '127.0.0.1',
						userAgent: 'test',
						acceptLanguage: null,
						region: {
							countryCode: null,
							regionCode: null,
						},
					},
				}),
				{
					status: 200,
					headers: { 'content-type': 'application/json' },
				}
			)
		);
		globalThis.fetch = mockFetch;

		const result = await status(context);

		expect(result.ok).toBe(true);
		expect(result.data?.version).toBe('1.0.0');

		const fetchCall = mockFetch.mock.calls[0];
		expect(fetchCall[0]).toContain('/status');
		expect(fetchCall[1].method).toBe('GET');
	});

	it('should handle status endpoint errors', async () => {
		const context: FetcherContext = {
			baseUrl: 'https://api.example.com',
			headers: {},
			retryConfig: { maxRetries: 0 }, // Disable retries for this test
		};

		const mockFetch = vi.fn().mockResolvedValueOnce(
			new Response(JSON.stringify({ message: 'Service unavailable' }), {
				status: 503,
				headers: { 'content-type': 'application/json' },
			})
		);
		globalThis.fetch = mockFetch;

		const result = await status(context);

		expect(result.ok).toBe(false);
		expect(result.error?.status).toBe(503);
	});
});
