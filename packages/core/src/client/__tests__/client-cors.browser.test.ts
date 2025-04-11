import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { C15tClient } from '../client-c15t';

/**
 * @vitest-environment jsdom
 */
describe('CORS functionality', () => {
	let originalFetch: typeof fetch;

	beforeEach(() => {
		originalFetch = window.fetch;
		// Use a simpler approach without storing the spy
		vi.spyOn(window, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
		window.fetch = originalFetch;
	});

	it('should set the correct CORS mode in fetch options', async () => {
		// Use a different CORS mode than the default
		const client = new C15tClient({
			backendURL: '/api/c15t',
			corsMode: 'same-origin',
		});

		// Mock the response
		vi.mocked(window.fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Make the request
		await client.showConsentBanner();

		// Verify the CORS mode was set correctly
		expect(window.fetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t'),
			expect.objectContaining({
				mode: 'same-origin',
			})
		);
	});

	it('should use default CORS mode when not specified', async () => {
		// Create client without specifying CORS mode
		const client = new C15tClient({
			backendURL: '/api/c15t',
		});

		// Mock the response
		vi.mocked(window.fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Make the request
		await client.showConsentBanner();

		// Verify the default CORS mode was used
		expect(window.fetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t'),
			expect.objectContaining({
				mode: 'cors', // Default mode
			})
		);
	});

	it('should include credentials in CORS requests by default', async () => {
		const client = new C15tClient({
			backendURL: '/api/c15t',
		});

		// Mock the response
		vi.mocked(window.fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Make the request
		await client.showConsentBanner();

		// Verify credentials are included
		expect(window.fetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t'),
			expect.objectContaining({
				credentials: 'include',
			})
		);
	});

	it('should handle CORS errors correctly', async () => {
		const client = new C15tClient({
			backendURL: '/api/c15t',
		});

		// Simulate a CORS error
		const corsError = new TypeError('Failed to fetch');
		vi.mocked(window.fetch).mockRejectedValueOnce(corsError);

		// Track error callback
		const onErrorMock = vi.fn();

		// Make the request
		const response = await client.showConsentBanner({
			onError: onErrorMock,
		});

		// Verify error handling
		expect(response.ok).toBe(false);
		expect(response.error?.code).toBe('NETWORK_ERROR');
		expect(onErrorMock).toHaveBeenCalledTimes(1);
	});

	it('should respect origin policy with CORS', async () => {
		const client = new C15tClient({
			backendURL: 'https://api.example.com/c15t',
			corsMode: 'cors',
		});

		// Mock the response with CORS headers
		vi.mocked(window.fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			})
		);

		// Make the request
		const response = await client.showConsentBanner();

		// Verify the request was properly configured and successful
		expect(window.fetch).toHaveBeenCalledWith(
			expect.stringContaining('https://api.example.com/c15t'),
			expect.objectContaining({
				mode: 'cors',
				credentials: 'include',
			})
		);
		expect(response.ok).toBe(true);
	});

	// Additional CORS error scenarios:

	it('should handle 403 Forbidden CORS errors', async () => {
		const client = new C15tClient({
			backendURL: 'https://api.example.com/c15t',
		});

		// Simulate a 403 Forbidden response due to CORS policy
		vi.mocked(window.fetch).mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					message: 'CORS policy violation: Origin not allowed',
					code: 'CORS_ERROR',
				}),
				{
					status: 403,
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)
		);

		// Track error callback
		const onErrorMock = vi.fn();

		// Make the request
		const response = await client.showConsentBanner({
			onError: onErrorMock,
		});

		// Verify error handling
		expect(response.ok).toBe(false);
		expect(response.error?.status).toBe(403);
		expect(response.error?.message).toContain('CORS policy violation');
		expect(onErrorMock).toHaveBeenCalledTimes(1);
	});

	it('should handle missing CORS headers', async () => {
		const client = new C15tClient({
			backendURL: 'https://api.example.com/c15t',
		});

		// In the client implementation, network errors get a generic message
		// So we need to mock the error handling to simulate the real error
		const corsError = new TypeError(
			'Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource'
		);
		vi.mocked(window.fetch).mockRejectedValueOnce(corsError);

		// Simple error callback to verify it's called
		const onErrorMock = vi.fn();

		// Make the request
		const response = await client.showConsentBanner({
			onError: onErrorMock,
		});

		// Verify error handling for missing CORS headers
		expect(response.ok).toBe(false);
		expect(response.error?.code).toBe('NETWORK_ERROR');
		expect(onErrorMock).toHaveBeenCalled();
		// Verify first argument contains the expected error code
		expect(onErrorMock.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				error: expect.objectContaining({
					code: 'NETWORK_ERROR',
				}),
			})
		);
	});

	it('should handle preflight rejection', async () => {
		const client = new C15tClient({
			backendURL: 'https://api.example.com/c15t',
		});

		// Simulate a preflight rejection error (OPTIONS request failing)
		const corsError = new TypeError(
			'Failed to fetch: OPTIONS preflight response did not succeed'
		);
		vi.mocked(window.fetch).mockRejectedValueOnce(corsError);

		// Simple error callback to verify it's called
		const onErrorMock = vi.fn();

		// Make the request with a custom header to trigger preflight
		const response = await client.setConsent({
			onError: onErrorMock,
			headers: {
				'X-Custom-Header': 'value', // Custom header would trigger preflight
			},
			body: {
				type: 'cookie_banner',
				domain: 'example.com',
				preferences: {
					analytics: true,
				},
			},
		});

		// Verify error handling for preflight rejection
		expect(response.ok).toBe(false);
		expect(response.error?.code).toBe('NETWORK_ERROR');
		expect(onErrorMock).toHaveBeenCalled();
		// Verify first argument contains the expected error code
		expect(onErrorMock.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				error: expect.objectContaining({
					code: 'NETWORK_ERROR',
				}),
			})
		);
	});

	// Additional CORS configurations:

	it('should support credentials: omit for CORS requests', async () => {
		// Override fetch to capture the actual options passed
		const fetchMock = vi.fn().mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);
		window.fetch = fetchMock;

		// Create a client with custom fetch options that directly pass credentials: 'omit'
		const client = new C15tClient({
			backendURL: '/api/c15t',
		});

		// Make the request with request-specific fetch options
		await client.$fetch('/show-consent-banner', {
			fetchOptions: {
				credentials: 'omit', // Override the default 'include'
			},
		});

		// Verify credentials mode was set to 'omit'
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t'),
			expect.objectContaining({
				credentials: 'omit',
			})
		);
	});

	it('should send custom headers in CORS requests', async () => {
		const client = new C15tClient({
			backendURL: 'https://api.example.com/c15t',
			headers: {
				'X-API-Key': 'secret-api-key',
				'X-Client-ID': 'test-client',
			},
		});

		// Mock successful response
		vi.mocked(window.fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'X-API-Key, X-Client-ID',
				},
			})
		);

		// Make the request
		await client.showConsentBanner();

		// Verify custom headers were included
		expect(window.fetch).toHaveBeenCalledWith(
			expect.stringContaining('https://api.example.com/c15t'),
			expect.objectContaining({
				headers: expect.objectContaining({
					'X-API-Key': 'secret-api-key',
					'X-Client-ID': 'test-client',
				}),
			})
		);
	});

	it('should retry on CORS-specific errors with appropriate config', async () => {
		// Create a function to mock fetch with multiple responses
		const fetchMock = vi
			.fn()
			// First request fails with a CORS error
			.mockRejectedValueOnce(
				new TypeError('CORS error: No Access-Control-Allow-Origin header')
			)
			// Second request succeeds
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ showConsentBanner: true }), {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				})
			);

		// Override fetch with our mock
		window.fetch = fetchMock;

		// Create client with retry config
		const client = new C15tClient({
			backendURL: 'https://api.example.com/c15t',
			retryConfig: {
				maxRetries: 1,
				initialDelayMs: 10,
				retryOnNetworkError: true, // Important for CORS errors which manifest as network errors
			},
		});

		// Mock setTimeout to execute callbacks immediately for faster tests
		const originalSetTimeout = global.setTimeout;
		global.setTimeout = vi
			.fn()
			.mockImplementation((callback: (...args: unknown[]) => void) => {
				callback();
				return 1;
			}) as unknown as typeof setTimeout;

		try {
			// Make the request
			const response = await client.showConsentBanner();

			// Verify the fetch was called twice (original + retry)
			expect(fetchMock).toHaveBeenCalledTimes(2);
			// And the final response should be successful
			expect(response.ok).toBe(true);
		} finally {
			// Restore setTimeout
			global.setTimeout = originalSetTimeout;
		}
	});
});
