import { beforeEach, describe, expect, it, vi } from 'vitest';
import { C15tClient } from '../client-c15t';
import { CustomClient } from '../client-custom';
import { configureConsentManager } from '../client-factory';
import { OfflineClient } from '../client-offline';

// Note: For Vitest browser mode, we don't need to mock localStorage or fetch
// as they're available in the browser environment

/**
 * @vitest-environment jsdom
 */
describe('c15t Client Browser Tests', () => {
	// Spy on fetch instead of mocking it completely
	const fetchSpy = vi.spyOn(global, 'fetch');

	beforeEach(() => {
		fetchSpy.mockReset();
		localStorage.clear();

		// Default mock for fetch
		fetchSpy.mockResolvedValue(
			new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);
	});

	it('should make fetch requests in browser environment', async () => {
		// Mock fetch response for this test
		fetchSpy.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					showConsentBanner: true,
					jurisdiction: { code: 'EU', message: 'European Union' },
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}
			)
		);

		// Configure the client
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		}) as C15tClient;

		// Call the API
		const response = await client.showConsentBanner();

		// Assertions
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t/show-consent-banner'),
			expect.any(Object)
		);
		expect(response.ok).toBe(true);
		expect(response.data).toEqual({
			showConsentBanner: true,
			jurisdiction: { code: 'EU', message: 'European Union' },
		});
	});

	it('should set Content-Type header for POST requests', async () => {
		// Direct fetch spy
		const fetchSpy = vi.spyOn(window, 'fetch');

		// Configure client
		const client = new C15tClient({
			backendURL: '/api/c15t',
		});

		// Mock successful response
		fetchSpy.mockResolvedValueOnce(
			new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Create test data
		const consentData = {
			type: 'cookie_banner' as const,
			domain: 'example.com',
			preferences: {
				analytics: true,
			},
		};

		// Call API
		await client.setConsent({
			body: consentData,
		});

		// Verify Content-Type header was set
		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t/consent/set'), // Updated to match the correct path
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'Content-Type': 'application/json',
				}),
			})
		);
	});

	it('should handle network errors in browser', async () => {
		// Reset our mocks to ensure clean state
		fetchSpy.mockReset();

		// Simulate network error with a more explicit mock
		// This ensures the promise is actually rejected
		fetchSpy.mockImplementationOnce(() => {
			return Promise.reject(new TypeError('Failed to fetch'));
		});

		// Configure the client
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		}) as C15tClient;

		// Create a more direct error handler that we can verify was called
		let errorWasCaught = false;
		const errorHandler = () => {
			errorWasCaught = true;
		};

		// Call the API with our error handler
		const response = await client.showConsentBanner({
			onError: errorHandler,
			testing: true, // Disable offline fallback
		});

		// Check error handler was called
		expect(errorWasCaught).toBe(true);

		// Check response properties
		expect(response.ok).toBe(false);
		expect(response.error).toBeDefined();
		expect(response.error?.message).toBeTruthy(); // Just check that there is an error message

		// The error code may be either NETWORK_ERROR or API_ERROR depending on environment
		expect(response.error?.code).toBeDefined();

		// Verify the request was made
		expect(fetchSpy).toHaveBeenCalled();
	});
});

describe('Offline Client Browser Tests', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should use real localStorage in browser environment', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'offline',
		}) as OfflineClient;

		// First check that localStorage doesn't have consent data
		expect(localStorage.getItem('c15t-consent')).toBeNull();

		// Set consent data
		const response = await client.setConsent({
			body: {
				type: 'cookie_banner',
				domain: 'example.com',
				preferences: {
					analytics: true,
					marketing: false,
				},
			},
		});

		// Verify response
		expect(response.ok).toBe(true);

		// Verify localStorage was updated
		const storedData = localStorage.getItem('c15t-consent');
		expect(storedData).not.toBeNull();

		if (storedData !== null) {
			const parsedData = JSON.parse(storedData);
			expect(parsedData.preferences).toEqual({
				analytics: true,
				marketing: false,
			});
		}
	});

	it('should check real localStorage for consent banner visibility', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'offline',
		}) as OfflineClient;

		// First call with empty localStorage
		let response = await client.showConsentBanner();
		expect(response.data?.showConsentBanner).toBe(true);

		// Store consent data in localStorage
		localStorage.setItem(
			'c15t-consent',
			JSON.stringify({
				timestamp: new Date().toISOString(),
				preferences: { analytics: true },
			})
		);

		// Second call with localStorage data
		response = await client.showConsentBanner();
		expect(response.data?.showConsentBanner).toBe(false);
	});

	it('should use custom localStorage key', async () => {
		const customKey = 'custom-consent-key';

		// Configure the client with custom key
		const client = new OfflineClient({
			localStorageKey: customKey,
		});

		// Set consent data
		await client.setConsent({
			body: {
				type: 'cookie_banner',
				domain: 'example.com',
				preferences: {
					analytics: true,
				},
			},
		});

		// Verify localStorage has data with custom key
		expect(localStorage.getItem(customKey)).not.toBeNull();
		// And default key doesn't have data
		expect(localStorage.getItem('c15t-consent')).toBeNull();
	});
});

describe('Custom Client Browser Tests', () => {
	// Real implementations for required handlers
	const handlers = {
		showConsentBanner: async () => ({
			data: {
				showConsentBanner: true,
				jurisdiction: { code: 'EU', message: 'European Union' },
				location: { countryCode: 'DE', regionCode: null },
			},
			ok: true,
			error: null,
			response: null,
		}),
		setConsent: (options) => {
			// Add consent data to localStorage to simulate real storage
			try {
				const key = 'custom-handler-consent';
				const data = {
					timestamp: new Date().toISOString(),
					preferences: options?.body?.preferences || {},
				};
				localStorage.setItem(key, JSON.stringify(data));
			} catch {
				// Ignore localStorage errors
			}

			return {
				data: { success: true },
				ok: true,
				error: null,
				response: null,
			};
		},
		verifyConsent: async () => ({
			data: { valid: true },
			ok: true,
			error: null,
			response: null,
		}),
	};

	beforeEach(() => {
		localStorage.clear();

		// Spy on handlers
		vi.spyOn(handlers, 'showConsentBanner');
		vi.spyOn(handlers, 'setConsent');
		vi.spyOn(handlers, 'verifyConsent');
	});

	it('should use custom handlers in browser environment', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'custom',
			//@ts-expect-error
			endpointHandlers: handlers,
		}) as CustomClient;

		// Call the API
		const response = await client.showConsentBanner();

		// Assertions
		expect(handlers.showConsentBanner).toHaveBeenCalledTimes(1);
		expect(response.ok).toBe(true);
		expect(response.data?.showConsentBanner).toBe(true);
	});

	it('should handle custom storage in browser', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'custom',
			//@ts-expect-error
			endpointHandlers: handlers,
		}) as CustomClient;

		// Set consent data with custom handler
		await client.setConsent({
			body: {
				type: 'cookie_banner',
				domain: 'example.com',
				preferences: {
					analytics: true,
					marketing: false,
				},
			},
		});

		// Verify custom handler was called
		expect(handlers.setConsent).toHaveBeenCalledTimes(1);

		// Verify storage was implemented by custom handler
		const storedData = localStorage.getItem('custom-handler-consent');
		expect(storedData).not.toBeNull();
		if (storedData !== null) {
			const parsedData = JSON.parse(storedData);
			expect(parsedData.preferences).toEqual({
				analytics: true,
				marketing: false,
			});
		}
	});

	it('should register and use dynamic handlers', async () => {
		// Configure the client
		const client = new CustomClient({
			//@ts-expect-error
			endpointHandlers: handlers,
		});

		// Define a dynamic handler
		const dynamicHandler = vi.fn().mockImplementation(async () => ({
			data: { custom: true },
			ok: true,
			error: null,
			response: null,
		}));

		// Register the dynamic handler
		client.registerHandler('/custom-endpoint', dynamicHandler);

		// Call the dynamic endpoint
		const response = await client.$fetch('/custom-endpoint');

		// Assertions
		expect(dynamicHandler).toHaveBeenCalledTimes(1);
		expect(response.ok).toBe(true);
		expect(response.data).toEqual({ custom: true });
	});
});
