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
					client: {
						acceptLanguage: null,
						ip: '127.0.0.1',
						region: {
							countryCode: null,
							regionCode: null,
						},
						userAgent: 'test',
					},
					timestamp: new Date().toISOString(),
					version: '1.0.0',
				}),
				{
					headers: { 'content-type': 'application/json' },
					status: 200,
				}
			)
		);
		globalThis.fetch = mockFetch;

		const result = await status(context);

		expect(result.ok).toBe(true);
		expect(result.data?.version).toBe('1.0.0');

		// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
		const fetchCall = mockFetch.mock.calls[0];
		expect(fetchCall[0]).toContain('/status');
		expect(fetchCall[1].method).toBe('GET');
	});

	it('should handle status endpoint errors', async () => {
		const context: FetcherContext = {
			baseUrl: 'https://api.example.com',
			headers: {},
			// Disable retries for this test
			retryConfig: { maxRetries: 0 },
		};

		const mockFetch = vi.fn().mockResolvedValueOnce(
			new Response(JSON.stringify({ message: 'Service unavailable' }), {
				headers: { 'content-type': 'application/json' },
				status: 503,
			})
		);
		globalThis.fetch = mockFetch;

		const result = await status(context);

		expect(result.ok).toBe(false);
		expect(result.error?.status).toBe(503);
	});
});
