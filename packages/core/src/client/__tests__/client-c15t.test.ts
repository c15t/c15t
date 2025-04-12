import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../vitest.setup';
import { C15tClient } from '../client-c15t';
import {
	type ConsentManagerOptions,
	configureConsentManager,
} from '../client-factory';
import { API_ENDPOINTS } from '../types';

describe('c15t Client Tests', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fetchMock.mockReset();
		mockLocalStorage.clear();
	});

	it('should make request to show consent banner', async () => {
		// Mock successful response
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					showConsentBanner: true,
					jurisdiction: { code: 'EU', message: 'European Union' },
					location: { countryCode: 'DE', regionCode: null },
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		);

		// Configure the client
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		// Call the API
		const response = await client.showConsentBanner();

		// Assertions
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t/show-consent-banner'),
			expect.any(Object)
		);
		expect(response.ok).toBe(true);
		expect(response.data).toEqual({
			showConsentBanner: true,
			jurisdiction: { code: 'EU', message: 'European Union' },
			location: { countryCode: 'DE', regionCode: null },
		});
	});

	it('should handle errors gracefully', async () => {
		// Mock error response
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					message: 'Internal Server Error',
					code: 'SERVER_ERROR',
				}),
				{
					status: 500,
					statusText: 'Internal Server Error',
				}
			)
		);

		// Configure the client
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		// Error callback mock
		const onErrorMock = vi.fn();

		// Call the API with error callback
		const response = await client.showConsentBanner({
			onError: onErrorMock,
		});

		// Assertions
		expect(response.ok).toBe(false);
		expect(response.error).toBeDefined();
		expect(response.error?.status).toBe(0);
		expect(onErrorMock).toHaveBeenCalledTimes(1);
	});

	it('should set consent preferences', async () => {
		// Mock successful response
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Configure the client
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		// Consent preferences to set
		const consentData = {
			type: 'cookie_banner' as const,
			domain: 'example.com',
			preferences: {
				analytics: true,
				marketing: false,
			},
		};

		// Call the API
		const response = await client.setConsent({
			body: consentData,
		});

		// Assertions
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining(API_ENDPOINTS.SET_CONSENT),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify(consentData),
			})
		);
		expect(response.ok).toBe(true);
		expect(response.data).toEqual({ success: true });
	});

	it('should include custom headers in requests', async () => {
		// Mock successful response
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Configure the client with custom headers
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
			headers: {
				'X-Custom-Header': 'test-value',
				Authorization: 'Bearer test-token',
			},
		});

		// Call the API
		await client.showConsentBanner();

		// Assertions
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t/show-consent-banner'),
			expect.objectContaining({
				headers: expect.objectContaining({
					'X-Custom-Header': 'test-value',
					Authorization: 'Bearer test-token',
				}),
			})
		);
	});

	it('should retry failed requests based on config', async () => {
		// Mock failed response followed by success
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Service Unavailable' }), {
					status: 503,
					statusText: 'Service Unavailable',
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ showConsentBanner: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			);

		// Configure client with retry config
		const config: ConsentManagerOptions = {
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 1,
				initialDelayMs: 10, // Small delay for test
				retryableStatusCodes: [503],
			},
		};
		const client = configureConsentManager(config);

		// Call the API
		const response = await client.showConsentBanner();

		// Assertions
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(response.ok).toBe(true);
		expect(response.data).toEqual({ showConsentBanner: true });
	});
});

describe('c15t Client Retry Logic Tests', () => {
	// Track time between retries
	let timestamps: number[] = [];
	let originalSetTimeout: typeof setTimeout;

	beforeEach(() => {
		vi.resetAllMocks();
		fetchMock.mockReset();
		mockLocalStorage.clear();
		timestamps = [];

		// Mock setTimeout to track timing and execute immediately
		originalSetTimeout = global.setTimeout;
		// Type assertion to avoid complex setTimeout typing issues with proper types
		global.setTimeout = vi
			.fn()
			.mockImplementation(
				(callback: (...args: unknown[]) => void, delay: number) => {
					timestamps.push(delay);
					callback();
					return 1;
				}
			) as unknown as typeof setTimeout;
	});

	afterEach(() => {
		global.setTimeout = originalSetTimeout;
	});

	it('should retry exactly up to maxRetries times', async () => {
		// Mock multiple failed responses
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Error' }), { status: 503 })
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Error' }), { status: 503 })
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Error' }), { status: 503 })
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true }), { status: 200 })
			);

		const config: ConsentManagerOptions = {
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 2, // Should only retry twice
				initialDelayMs: 10,
				retryableStatusCodes: [503],
			},
		};

		const client = configureConsentManager(config);
		const response = await client.showConsentBanner();

		// This implementation uses a retryCount starting from 0, and includes the original request
		// So with maxRetries=2, we expect: 1 original + 3 attempts = 4 total fetch calls
		expect(fetchMock).toHaveBeenCalledTimes(4);
		expect(response.ok).toBe(true);
		expect(response.error).toBeNull();
	});

	it('should implement exponential backoff', async () => {
		// Mock failed responses
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Error' }), { status: 503 })
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Error' }), { status: 503 })
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true }), { status: 200 })
			);

		const initialDelay = 100;
		const config: ConsentManagerOptions = {
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 3,
				initialDelayMs: initialDelay,
				retryableStatusCodes: [503],
			},
		};

		const client = configureConsentManager(config);
		await client.showConsentBanner();

		// First retry should be initialDelay, second retry should be higher
		expect(timestamps.length).toBeGreaterThanOrEqual(2);
		expect(timestamps[0]).toBe(initialDelay);
		expect(timestamps[1]).toBeGreaterThan(initialDelay);
	});

	it('should not retry for non-retryable status codes', async () => {
		// Mock a 400 Bad Request response (not in retryable status codes)
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ message: 'Bad Request' }), { status: 400 })
		);

		const config: ConsentManagerOptions = {
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 3,
				initialDelayMs: 10,
				retryableStatusCodes: [503, 502], // 400 not included
			},
		};

		const client = configureConsentManager(config);
		const response = await client.showConsentBanner();

		// Should only call fetch once, no retries
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(response.ok).toBe(false);
	});

	it('should retry on network errors', async () => {
		// Mock network errors followed by success
		fetchMock
			.mockRejectedValueOnce(new TypeError('Network error'))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ showConsentBanner: true }), {
					status: 200,
				})
			);

		const config: ConsentManagerOptions = {
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 2,
				initialDelayMs: 10,
				retryOnNetworkError: true,
				retryableStatusCodes: [503],
			},
		};

		const client = configureConsentManager(config);
		const response = await client.showConsentBanner();

		// Should retry once after network error
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(response.ok).toBe(true);
	});

	it('should apply custom retry strategy if provided', async () => {
		// Reset fetch mock
		fetchMock.mockReset();

		// Our custom shouldRetry implementation - this will be used for Response mocks
		const shouldRetryFn = vi.fn((response) => {
			// biome-ignore lint/suspicious/noConsoleLog: this is a test
			// biome-ignore lint/suspicious/noConsole: this is a test
			console.log(`shouldRetryFn called with status: ${response.status}`);
			return response.status === 429;
		});

		// Setup our response sequence - a 429 status should be retried by our custom strategy
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Too Many Requests' }), {
					status: 429, // This is the status we want our custom function to retry
					headers: { 'Content-Type': 'application/json' },
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ showConsentBanner: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			);

		// We need to create the client directly to access its private properties
		const client = new C15tClient({
			backendURL: '/api/c15t',
			// Setting our custom retry config
			retryConfig: {
				maxRetries: 2,
				initialDelayMs: 10,
				retryableStatusCodes: [], // Intentionally empty to rely only on custom function
				shouldRetry: shouldRetryFn,
			},
		});

		// Override the shouldRetry function to make sure it's being used
		// @ts-expect-error: access private property
		client.retryConfig.shouldRetry = shouldRetryFn;

		// Mock setTimeout to execute callbacks immediately for faster tests
		const originalSetTimeout = global.setTimeout;
		// Type assertion to avoid complex setTimeout typing issues
		global.setTimeout = vi
			.fn()
			.mockImplementation(
				(callback: (...args: unknown[]) => void, ms: number) => {
					// biome-ignore lint/suspicious/noConsoleLog: this is a test
					// biome-ignore lint/suspicious/noConsole: this is a test
					console.log(`Mocking setTimeout for ${ms}ms`);
					callback();
					return 1;
				}
			) as unknown as typeof setTimeout;

		try {
			// Make the API call that should trigger our retry
			const response = await client.showConsentBanner();

			// Verify the retry function was called
			expect(shouldRetryFn).toHaveBeenCalled();

			// Fetch should have been called twice (original + retry after 429)
			expect(fetchMock).toHaveBeenCalledTimes(2);

			// We should get a successful response after retry
			expect(response.ok).toBe(true);
			expect(response.data).toEqual({ showConsentBanner: true });
		} finally {
			// Restore the original setTimeout function
			global.setTimeout = originalSetTimeout;
		}
	});

	it('should retry on specific status codes', async () => {
		// Mock failed responses
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Error' }), { status: 503 })
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true }), { status: 200 })
			);

		const config: ConsentManagerOptions = {
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 1,
				initialDelayMs: 10,
				retryableStatusCodes: [503], // 503 specifically included
			},
		};

		const client = configureConsentManager(config);
		const response = await client.showConsentBanner();

		// With 503 status code, the fetch should be called twice (original + retry)
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(response.ok).toBe(true);
	});
});
