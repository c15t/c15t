import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../../vitest.setup';
import { STORAGE_KEY_V2 } from '../../../store/initial-state';
import { configureConsentManager } from '../../client-factory';
import { API_ENDPOINTS } from '../../types';
import { C15tClient } from '../index';

describe('c15t Client identifyUser Tests', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fetchMock.mockReset();
		mockLocalStorage.clear();
	});

	it('should successfully identify user', async () => {
		// Mock successful response
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Set up existing consent in storage
		const existingConsent = {
			consents: { analytics: true },
			consentInfo: {
				id: 'consent-123',
				time: Date.now(),
				identified: false,
			},
		};
		mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingConsent));

		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		const identifyData = {
			consentId: 'consent-123',
			externalId: 'user-456',
		};

		const response = await client.identifyUser({ body: identifyData });

		// Assertions
		expect(response.ok).toBe(true);
		expect(response.data?.success).toBe(true);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining(API_ENDPOINTS.IDENTIFY_CONSENT),
			expect.objectContaining({
				method: 'PATCH',
				body: JSON.stringify(identifyData),
			})
		);

		// Verify localStorage was updated to mark as identified
		expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
			STORAGE_KEY_V2,
			expect.stringContaining('"identified":true')
		);
	});

	it('should use offline fallback for identifyUser on API failure', async () => {
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

		// Set up existing consent in storage
		const existingConsent = {
			consents: { analytics: true },
			consentInfo: {
				id: 'consent-123',
				time: Date.now(),
				identified: false,
			},
		};
		mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingConsent));

		// Spy on console.warn to verify it's called
		const consoleWarnSpy = vi.spyOn(console, 'warn');
		// Spy on localStorage to verify it's called
		const localStorageSetItemSpy = vi.spyOn(mockLocalStorage, 'setItem');

		const identifyData = {
			consentId: 'consent-123',
			externalId: 'user-456',
		};

		// Call the API that will fail
		const response = await client.identifyUser({ body: identifyData });

		// Assertions
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining('falling back to offline mode')
		);
		expect(response.ok).toBe(true);

		// Check localStorage for both the consent update and pending submissions
		expect(localStorageSetItemSpy).toHaveBeenCalledWith(
			STORAGE_KEY_V2,
			expect.stringContaining('"identified":true')
		);
		expect(localStorageSetItemSpy).toHaveBeenCalledWith(
			'c15t-pending-identify-user-submissions',
			expect.stringContaining(JSON.stringify([identifyData]))
		);
	});

	it('should store multiple pending identify-user submissions', async () => {
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

		// Set up existing consent in storage
		const existingConsent = {
			consents: { analytics: true },
			consentInfo: {
				id: 'consent-123',
				time: Date.now(),
				identified: false,
			},
		};
		mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingConsent));

		// Create two different identify-user submissions
		const firstIdentify = {
			consentId: 'consent-123',
			externalId: 'user-456',
		};

		const secondIdentify = {
			consentId: 'consent-456',
			externalId: 'user-789',
		};

		// Submit first identify-user request
		await client.identifyUser({ body: firstIdentify });

		// Mock localStorage to return the first submission when checking for duplicates
		getItemSpy.mockImplementation((key) => {
			if (key === 'c15t-pending-identify-user-submissions') {
				return JSON.stringify([firstIdentify]);
			}
			return JSON.stringify(existingConsent);
		});

		// Submit second identify-user request
		await client.identifyUser({ body: secondIdentify });

		// Get all localStorage setItem calls
		const setItemCalls = setItemSpy.mock.calls.filter(
			(call) => call[0] === 'c15t-pending-identify-user-submissions'
		);

		// Verify that both submissions were stored
		expect(setItemCalls.length).toBeGreaterThan(0);
		const lastCall = setItemCalls[setItemCalls.length - 1];
		if (lastCall?.[1]) {
			const storedSubmissions = JSON.parse(lastCall[1] as string);
			expect(storedSubmissions).toHaveLength(2);
			expect(storedSubmissions).toContainEqual(firstIdentify);
			expect(storedSubmissions).toContainEqual(secondIdentify);
		}
	}, 10000);

	it('should retry pending identify-user submissions on initialization', async () => {
		// Mock localStorage with existing pending submissions
		const pendingSubmissionsKey = 'c15t-pending-identify-user-submissions';
		const identifyData = {
			consentId: 'consent-123',
			externalId: 'user-456',
		};

		mockLocalStorage.getItem.mockImplementation((key) => {
			if (key === pendingSubmissionsKey) {
				return JSON.stringify([identifyData]);
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

		// Mock setTimeout to execute callbacks immediately for faster tests
		const originalSetTimeout = global.setTimeout;
		// Using proper type for setTimeout mock
		// @ts-expect-error
		global.setTimeout = vi.fn((cb: () => void): NodeJS.Timeout => {
			cb();
			return 0 as unknown as NodeJS.Timeout;
		});

		try {
			// We need to manually call processPendingIdentifyUserSubmissions since we're directly instantiating C15tClient
			// In a real app, this would happen on init via checkPendingIdentifyUserSubmissions
			// @ts-expect-error accessing private method for testing
			await client.processPendingIdentifyUserSubmissions([identifyData]);

			// Assertions
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining(API_ENDPOINTS.IDENTIFY_CONSENT),
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify(identifyData),
				})
			);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('Successfully resubmitted identify-user')
			);

			// Check that localStorage was cleared after successful submission
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
				pendingSubmissionsKey
			);
		} finally {
			// Restore original setTimeout
			global.setTimeout = originalSetTimeout;
		}
	});

	it('should update consent storage when identify-user succeeds', async () => {
		// Mock successful response
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Set up existing consent in storage
		const existingConsent = {
			consents: { analytics: true },
			consentInfo: {
				id: 'consent-123',
				time: Date.now(),
				identified: false,
			},
		};
		mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingConsent));

		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		const identifyData = {
			consentId: 'consent-123',
			externalId: 'user-456',
		};

		await client.identifyUser({ body: identifyData });

		// Verify localStorage was updated to mark as identified
		const setItemCalls = mockLocalStorage.setItem.mock.calls.filter(
			(call) => call[0] === STORAGE_KEY_V2
		);
		expect(setItemCalls.length).toBeGreaterThan(0);

		const lastCall = setItemCalls[setItemCalls.length - 1];
		if (lastCall?.[1]) {
			const storedData = JSON.parse(lastCall[1] as string);
			expect(storedData.consentInfo.identified).toBe(true);
		}
	});
});
