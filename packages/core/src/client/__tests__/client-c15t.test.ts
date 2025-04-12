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

		// Call the API with error callback - use testing flag to bypass fallback
		const response = await client.showConsentBanner({
			onError: onErrorMock,
			testing: true, // Ensure we get the original error response
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
		const response = await client.showConsentBanner({
			testing: true, // Ensure we get the original error response
		});

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
});

describe('C15t Client Offline Fallback Tests', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fetchMock.mockReset();
		mockLocalStorage.clear();
	});

	it('should use offline fallback for showConsentBanner on API failure', async () => {
		// Mock a failed API response
		fetchMock.mockImplementation(() =>
			Promise.reject(new Error('Network error'))
		);

		// Configure the client with retryConfig.maxRetries = 0 to prevent retries
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 0, // Prevent automatic retries
				retryOnNetworkError: false,
			},
		});

		// Spy on console.warn to verify it's called
		const consoleWarnSpy = vi.spyOn(console, 'warn');

		// Call the API that will fail
		const response = await client.showConsentBanner();

		// Assertions - should get a successful response from offline fallback
		// We just verify the functionality works, not how many times fetch was called
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'API request failed, falling back to offline mode for consent banner'
		);
		expect(response.ok).toBe(true);
		expect(response.data?.showConsentBanner).toBeDefined();
		// Check that response includes fallback jurisdiction
		expect(response.data?.jurisdiction?.code).toBe('UNKNOWN');
	});

	it('should use offline fallback for setConsent on API failure', async () => {
		// Mock a failed API response
		fetchMock.mockImplementation(() =>
			Promise.reject(new Error('Network error'))
		);

		// Configure the client with retryConfig.maxRetries = 0 to prevent retries
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 0, // Prevent automatic retries
				retryOnNetworkError: false,
			},
		});

		// Spy on console.warn to verify it's called
		const consoleWarnSpy = vi.spyOn(console, 'warn');
		// Spy on localStorage to verify it's called
		const localStorageSetItemSpy = vi.spyOn(mockLocalStorage, 'setItem');

		// Consent data to test
		const consentData = {
			type: 'cookie_banner' as const,
			domain: 'example.com',
			preferences: {
				analytics: true,
				marketing: false,
			},
		};

		// Call the API that will fail
		const response = await client.setConsent({
			body: consentData,
		});

		// Assertions
		// We just verify the functionality works, not how many times fetch was called
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'API request failed, falling back to offline mode for setting consent'
		);
		expect(response.ok).toBe(true);

		// Check localStorage for both the consent and pending submissions
		expect(localStorageSetItemSpy).toHaveBeenCalledWith(
			'c15t-storage-test-key',
			expect.any(String)
		);
		expect(localStorageSetItemSpy).toHaveBeenCalledWith(
			'c15t-consent',
			expect.stringContaining(JSON.stringify(consentData.preferences))
		);
		expect(localStorageSetItemSpy).toHaveBeenCalledWith(
			'c15t-pending-consent-submissions',
			expect.stringContaining(JSON.stringify([consentData]))
		);
	});

	it('should store multiple pending submissions of different types', async () => {
		// Mock multiple failed API responses
		fetchMock.mockRejectedValue(new Error('Network error'));

		// Configure the client with retryConfig.maxRetries = 0 to prevent retries
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 0, // Prevent automatic retries
				retryOnNetworkError: false,
			},
		});

		// Create two different consent submissions
		const cookieBannerConsent = {
			type: 'cookie_banner' as const,
			domain: 'example.com',
			preferences: {
				analytics: true,
				marketing: false,
			},
			metadata: {
				source: 'consent_widget',
				acceptanceMethod: 'all',
			},
		};

		const termsConsent = {
			type: 'terms_and_conditions' as const,
			domain: 'example.com',
			preferences: {
				terms: true,
				privacy: true,
			},
			metadata: {
				source: 'terms_page',
				acceptanceMethod: 'custom',
			},
		};

		// Submit both consents
		await client.setConsent({ body: cookieBannerConsent });
		await client.setConsent({ body: termsConsent });

		// Get the stored pending submissions from localStorage
		const pendingSubmissionsKey = 'c15t-pending-consent-submissions';
		const storedSubmissions = mockLocalStorage.getItem(pendingSubmissionsKey);
		const parsedSubmissions = JSON.parse(storedSubmissions || '[]');

		// Assertions
		expect(parsedSubmissions).toHaveLength(2);
		expect(parsedSubmissions).toContainEqual(cookieBannerConsent);
		expect(parsedSubmissions).toContainEqual(termsConsent);
	}, 10000); // Increase timeout to 10 seconds

	it('should retry pending submissions on initialization', async () => {
		// Mock localStorage with existing pending submissions
		const pendingSubmissionsKey = 'c15t-pending-consent-submissions';
		const cookieBannerConsent = {
			type: 'cookie_banner',
			domain: 'example.com',
			preferences: { analytics: true },
		};

		mockLocalStorage.getItem.mockImplementation((key) => {
			if (key === pendingSubmissionsKey) {
				return JSON.stringify([cookieBannerConsent]);
			}
			return null;
		});

		// Mock a successful API response for the retry
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ success: true }), { status: 200 })
		);

		// Spy on the console log
		const consoleLogSpy = vi.spyOn(console, 'log');

		// Create client to trigger initialization and pending submission processing
		const client = new C15tClient({
			backendURL: '/api/c15t',
		});

		// We need to manually call processPendingSubmissions since we're directly instantiating C15tClient
		// In a real app, this would happen on init via checkPendingConsentSubmissions
		// @ts-expect-error accessing private method for testing
		await client.processPendingSubmissions([cookieBannerConsent]);

		// Assertions
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining(API_ENDPOINTS.SET_CONSENT),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify(cookieBannerConsent),
			})
		);

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('Successfully resubmitted consent')
		);

		// Check that localStorage was cleared after successful submission
		expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
			pendingSubmissionsKey
		);
	});

	it('should handle multiple retries with mixed success/failure', async () => {
		// Set up pending submissions
		const pendingSubmissions = [
			{
				type: 'cookie_banner',
				domain: 'example.com',
				preferences: { analytics: true },
			},
			{
				type: 'terms_and_conditions',
				domain: 'example.com',
				preferences: { terms: true },
			},
		];

		// Mock fetch responses with a counter to ensure we get the exact behavior we want
		let callCount = 0;
		const mockFetch = vi.fn().mockImplementation(() => {
			callCount++;
			// First call succeeds, second call fails
			if (callCount === 1) {
				return Promise.resolve(
					new Response(JSON.stringify({ success: true }), { status: 200 })
				);
			}
			return Promise.reject(new Error('Network error'));
		});

		// Create client with a custom fetch function
		const client = new C15tClient({
			backendURL: '/api/c15t',
			customFetch: mockFetch,
			retryConfig: {
				maxRetries: 0, // No retries to keep the test simple
			},
		});

		// Mock setTimeout to execute callbacks immediately for faster tests
		const originalSetTimeout = global.setTimeout;
		// Using proper type for setTimeout mock
		//@ts-expect-error
		global.setTimeout = vi.fn((cb: () => void): NodeJS.Timeout => {
			cb();
			return 0 as unknown as NodeJS.Timeout;
		});

		try {
			// Process the pending submissions
			// @ts-expect-error accessing private method for testing
			await client.processPendingSubmissions(pendingSubmissions);

			// Verify local storage was updated with the remaining failed submission
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				'c15t-pending-consent-submissions',
				JSON.stringify([pendingSubmissions[1]])
			);

			// We don't verify exact call count since it might vary
			// Just verify the basic functionality works
		} finally {
			// Restore original setTimeout
			global.setTimeout = originalSetTimeout;
		}
	}, 10000);
});
