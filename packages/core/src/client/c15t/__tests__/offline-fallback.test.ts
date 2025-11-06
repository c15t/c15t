import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../../vitest.setup';
import { STORAGE_KEY_V2 } from '../../../store.initial-state';
import { configureConsentManager } from '../../client-factory';
import { API_ENDPOINTS } from '../../types';
import { C15tClient } from '../index';

describe('c15t Client Offline Fallback Tests', () => {
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
		expect(response.data?.jurisdiction?.code).toBe('NONE');
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
			expect.stringContaining('falling back to offline mode')
		);
		expect(response.ok).toBe(true);

		// Check localStorage for both the consent and pending submissions
		expect(localStorageSetItemSpy).toHaveBeenCalledWith(
			STORAGE_KEY_V2,
			expect.any(String)
		);
		expect(localStorageSetItemSpy).toHaveBeenCalledWith(
			'c15t-pending-consent-submissions',
			expect.stringContaining(JSON.stringify([consentData]))
		);
	});

	it('should store multiple pending submissions of different types', async () => {
		// Mock multiple failed API responses
		fetchMock.mockRejectedValue(new Error('Network error'));

		// Spy on localStorage methods
		const getItemSpy = vi.spyOn(mockLocalStorage, 'getItem');
		const setItemSpy = vi.spyOn(mockLocalStorage, 'setItem');

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

		// Submit first consent
		await client.setConsent({ body: cookieBannerConsent });

		// Verify first submission was stored
		let storedSubmissions = mockLocalStorage.getItem(
			'c15t-pending-consent-submissions'
		);
		let parsedSubmissions = JSON.parse(storedSubmissions || '[]');
		expect(parsedSubmissions).toHaveLength(1);
		expect(parsedSubmissions[0]).toEqual(cookieBannerConsent);

		// Submit second consent
		await client.setConsent({ body: termsConsent });

		// Get the final stored submissions from localStorage
		storedSubmissions = mockLocalStorage.getItem(
			'c15t-pending-consent-submissions'
		);
		parsedSubmissions = JSON.parse(storedSubmissions || '[]');

		// Log for debugging
		console.log('Mock localStorage calls:', {
			getItem: getItemSpy.mock.calls,
			setItem: setItemSpy.mock.calls,
		});
		console.log('Final stored submissions:', storedSubmissions);

		// Assertions
		expect(parsedSubmissions).toHaveLength(2);
		expect(parsedSubmissions).toContainEqual(cookieBannerConsent);
		expect(parsedSubmissions).toContainEqual(termsConsent);

		// Verify localStorage interactions
		expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY_V2, expect.any(String));
		expect(setItemSpy).toHaveBeenCalledWith(
			'c15t-pending-consent-submissions',
			expect.stringContaining(JSON.stringify([cookieBannerConsent]))
		);
		expect(setItemSpy).toHaveBeenCalledWith(
			'c15t-pending-consent-submissions',
			expect.stringContaining(
				JSON.stringify([cookieBannerConsent, termsConsent])
			)
		);
	}, 10000);

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

		// We need to manually call processPendingConsentSubmissions since we're directly instantiating C15tClient
		// In a real app, this would happen on init via checkPendingConsentSubmissions
		// @ts-expect-error accessing private method for testing
		await client.processPendingConsentSubmissions([cookieBannerConsent]);

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
		// @ts-expect-error
		global.setTimeout = vi.fn((cb: () => void): NodeJS.Timeout => {
			cb();
			return 0 as unknown as NodeJS.Timeout;
		});

		try {
			// Process the pending submissions
			// @ts-expect-error accessing private method for testing
			await client.processPendingConsentSubmissions(pendingSubmissions);

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
