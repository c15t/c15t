import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY_V2 } from '../../store/initial-state';
import { C15tClient } from '../c15t';
import { configureConsentManager } from '../client-factory';
import { CustomClient } from '../custom';
import type { OfflineClient } from '../offline';

// Note: For Vitest browser mode, we don't need to mock localStorage or fetch
// as they're available in the browser environment

/**
 * @vitest-environment jsdom
 */
describe('c15t Client Browser Tests', () => {
	// Mock fetch globally to ensure all fetch calls are intercepted
	let fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// Create a fresh fetch mock for each test
		fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);

		localStorage.clear();

		// Clear client registry to ensure fresh clients
		// @ts-expect-error: accessing private registry for testing
		configureConsentManager.clientRegistry?.clear();

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
			expect.stringContaining('/api/c15t/init'),
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
		// Reset the default mock and set up network error
		fetchSpy.mockReset();
		fetchSpy.mockImplementation(() => {
			return Promise.reject(new TypeError('Failed to fetch'));
		});

		// Configure the client with retry disabled to avoid multiple calls
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 0, // Disable retries for this test
			},
		}) as C15tClient;

		// Create a more direct error handler that we can verify was called
		let errorWasCaught = false;
		const errorHandler = () => {
			errorWasCaught = true;
		};

		// Call the API - should fallback to offline mode
		const response = await client.showConsentBanner({
			onError: errorHandler,
		});

		// Check response properties - offline fallback returns success
		expect(response.ok).toBe(true);
		expect(response.data).toBeDefined();
		expect(response.error).toBeNull();
		// Error handler is called by fetcher when network error occurs, before fallback
		expect(errorWasCaught).toBe(true);
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
		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();

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
		const storedData = localStorage.getItem(STORAGE_KEY_V2);
		expect(storedData).not.toBeNull();

		if (storedData !== null) {
			const parsedData = JSON.parse(storedData);
			expect(parsedData.consents).toMatchObject({
				analytics: true,
				marketing: false,
			});
		}
	});

	it('should use jurisdiction checking for consent banner visibility', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'offline',
		}) as OfflineClient;

		// Call without headers (defaults to GB - GDPR jurisdiction)
		let response = await client.showConsentBanner();
		expect(response.data?.showConsentBanner).toBe(true);
		expect(response.data?.jurisdiction?.code).toBe('GDPR');
		expect(response.data?.location?.countryCode).toBe('GB');

		// Call with GDPR country header
		response = await client.showConsentBanner({
			headers: { 'x-c15t-country': 'DE' },
		});
		expect(response.data?.showConsentBanner).toBe(true);
		expect(response.data?.jurisdiction?.code).toBe('GDPR');
		expect(response.data?.location?.countryCode).toBe('DE');

		// Call with non-regulated country header
		response = await client.showConsentBanner({
			headers: { 'x-c15t-country': 'US' },
		});
		expect(response.data?.showConsentBanner).toBe(false);
		expect(response.data?.jurisdiction?.code).toBe('NONE');
		expect(response.data?.location?.countryCode).toBe('US');
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
			expect(parsedData.preferences).toMatchObject({
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
