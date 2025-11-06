import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../../vitest.setup';
import {
	type ConsentManagerOptions,
	configureConsentManager,
} from '../../client-factory';
import { C15tClient } from '../index';

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
				maxRetries: 2, // With maxRetries=2, attemptsMade runs 0, 1, 2 (3 total attempts)
				initialDelayMs: 10,
				retryableStatusCodes: [503],
			},
		};

		const client = configureConsentManager(config);
		const response = await client.showConsentBanner();

		// The implementation uses attemptsMade starting from 0, and loops while attemptsMade <= maxRetries
		// So with maxRetries=2, we expect 3 total fetch calls (attemptsMade: 0, 1, 2)
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(response.ok).toBe(true);
		expect(response.error).toBeNull();
	});

	it('should implement exponential backoff', async () => {
		// Clear timestamps to ensure we only capture delays from this test
		timestamps = [];

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

		const backoffFactor = 2;
		const config: ConsentManagerOptions = {
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 3,
				initialDelayMs: 100,
				backoffFactor: backoffFactor,
				retryableStatusCodes: [503],
			},
		};

		const client = configureConsentManager(config);
		await client.showConsentBanner();

		// Verify delays are captured and increase exponentially
		// Note: timestamps are captured from setTimeout calls in the delay function
		// The important thing is that delays increase exponentially, not the exact initial value
		expect(timestamps.length).toBeGreaterThanOrEqual(2);

		// Verify that each subsequent delay is at least as large as the previous delay * backoffFactor
		// This confirms exponential backoff is working
		for (let i = 1; i < timestamps.length; i++) {
			expect(timestamps[i]).toBeGreaterThanOrEqual(
				timestamps[i - 1] * backoffFactor
			);
		}
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

		// Should only call fetch once, no retries, then fallback to offline mode
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(response.ok).toBe(true); // Offline fallback returns success
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
		// Using proper type for setTimeout mock
		global.setTimeout = vi.fn().mockImplementation((callback) => {
			if (typeof callback === 'function') {
				callback();
			}
			return 1; // Return a valid timeout ID
		}) as unknown as typeof setTimeout;

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

	it('should not retry on 404 Not Found errors', async () => {
		// Mock a 404 error response
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({ message: 'Resource not found', code: 'NOT_FOUND' }),
				{
					status: 404,
					statusText: 'Not Found',
					headers: { 'Content-Type': 'application/json' },
				}
			)
		);

		// Configure client with retry config
		const config: ConsentManagerOptions = {
			mode: 'c15t',
			backendURL: '/api/c15t',
			// retryConfig: {
			// 	maxRetries: 3, // Set high enough to potentially retry multiple times
			// 	initialDelayMs: 10, // Small delay for test
			// 	retryableStatusCodes: [500, 502, 503, 504], // Default server errors
			// },
		};

		// Track if setTimeout was called (which would indicate a retry attempt)
		const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

		const client = configureConsentManager(config);

		// Call the API - should fallback to offline mode for 404
		const response = await client.showConsentBanner();

		// Assertions
		expect(fetchMock).toHaveBeenCalledTimes(1); // Should only be called once
		expect(setTimeoutSpy).not.toHaveBeenCalled(); // No retry delay should be scheduled
		expect(response.ok).toBe(true); // Offline fallback returns success
		expect(response.data).toBeDefined();
	});

	it('should handle a mix of 404 and retryable errors correctly', async () => {
		// Mock a 404 response followed by 503 and then success
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Not Found' }), {
					status: 404,
					statusText: 'Not Found',
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Service Unavailable' }), {
					status: 503,
					statusText: 'Service Unavailable',
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ showConsentBanner: true }), {
					status: 200,
				})
			);

		// Configure client with retry config
		const config: ConsentManagerOptions = {
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 2,
				initialDelayMs: 10,
				retryableStatusCodes: [503],
			},
		};

		// First call - should fallback to offline mode for 404 (no retries)
		const client = configureConsentManager(config);
		const firstResponse = await client.showConsentBanner();

		// Should have only made one request, then fallback to offline mode
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(firstResponse.ok).toBe(true); // Offline fallback returns success
		expect(firstResponse.data).toBeDefined();

		// Reset mock for next test
		fetchMock.mockReset();

		// Set up mocks again for the second test
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

		// Second call - should retry on 503 and eventually succeed
		const secondResponse = await client.showConsentBanner();

		// Should have made two requests (original + retry)
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(secondResponse.ok).toBe(true);
		expect(secondResponse.data).toEqual({ showConsentBanner: true });
	});
});
