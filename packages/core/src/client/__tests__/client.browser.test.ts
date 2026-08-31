import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEY_V2 } from '../../store/initial-state';
import { configureConsentManager } from '../client-factory';
import { CustomClient } from '../custom';
import { C15tClient } from '../hosted';
import type { OfflineClient } from '../offline';

const assignInOrder = Object.assign;

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
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			})
		);
	});

	it('should make fetch requests in browser environment', async () => {
		// Mock fetch response for this test
		fetchSpy.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					branding: 'c15t',
					jurisdiction: 'GDPR',
					location: { countryCode: 'DE', regionCode: null },
					translations: {
						language: 'en',
						translations: {},
					},
				}),
				{
					headers: { 'Content-Type': 'application/json' },
					status: 200,
				}
			)
		);

		// Configure the client
		const client = configureConsentManager({
			backendURL: '/api/c15t',
			mode: 'hosted',
		}) as C15tClient;

		// Call the API
		const response = await client.init();

		// Assertions
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t/init'),
			expect.any(Object)
		);
		expect(response.ok).toBe(true);
		expect(response.data).toEqual({
			branding: 'c15t',
			jurisdiction: 'GDPR',
			location: { countryCode: 'DE', regionCode: null },
			translations: {
				language: 'en',
				translations: {},
			},
		});
	});

	it('should set Content-Type header for POST requests', async () => {
		// Direct fetch spy
		const fetchSpyLocal = vi.spyOn(window, 'fetch');

		// Configure client
		const client = new C15tClient({
			backendURL: '/api/c15t',
		});

		// Mock successful response
		fetchSpyLocal.mockResolvedValueOnce(
			new Response(JSON.stringify({ success: true }), {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			})
		);

		// Create test data
		const consentData = {
			domain: 'example.com',
			preferences: {
				analytics: true,
			},
			type: 'cookie_banner' as const,
		};

		// Call API
		await client.setConsent({
			body: consentData,
		});

		// Verify Content-Type header was set
		// v2.0 uses POST /subjects endpoint
		expect(fetchSpyLocal).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t/subjects'),
			expect.objectContaining({
				headers: expect.objectContaining({
					'Content-Type': 'application/json',
				}),
				method: 'POST',
			})
		);
	});

	it('should handle network errors in browser', async () => {
		// Reset the default mock and set up network error
		fetchSpy.mockReset();
		fetchSpy.mockImplementation(() =>
			Promise.reject(new TypeError('Failed to fetch'))
		);

		// Configure the client with retry disabled to avoid multiple calls
		const client = configureConsentManager({
			backendURL: '/api/c15t',
			mode: 'hosted',
			retryConfig: {
				// Disable retries for this test
				maxRetries: 0,
			},
		}) as C15tClient;

		// Create a more direct error handler that we can verify was called
		let errorWasCaught = false;
		const errorHandler = () => {
			errorWasCaught = true;
		};

		// Call the API - should fallback to offline mode
		const response = await client.init({
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
				domain: 'example.com',
				preferences: {
					analytics: true,
					marketing: false,
				},
				type: 'cookie_banner',
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
		let response = await client.init();
		expect(response.data?.jurisdiction).toBe('GDPR');
		expect(response.data?.location?.countryCode).toBe('GB');
		expect(response.data?.location?.regionCode).toBeNull();

		// Call with GDPR country header
		response = await client.init({
			headers: { 'x-c15t-country': 'DE' },
		});
		expect(response.data?.jurisdiction).toBe('GDPR');
		expect(response.data?.location?.countryCode).toBe('DE');
		expect(response.data?.location?.regionCode).toBeNull();

		// Call with non-regulated country header
		response = await client.init({
			headers: { 'x-c15t-country': 'US' },
		});
		expect(response.data?.jurisdiction).toBe('NONE');
		expect(response.data?.location?.countryCode).toBe('US');
		expect(response.data?.location?.regionCode).toBeNull();
	});
});

describe('Custom Client Browser Tests', () => {
	const customMode = 'custom';
	// Real implementations for required handlers
	const handlers = {
		identifyUser: () =>
			Promise.resolve({
				data: { success: true },
				error: null,
				ok: true,
				response: null,
			}),
		init: () =>
			Promise.resolve({
				data: {
					branding: 'c15t',
					jurisdiction: 'GDPR',
					location: { countryCode: 'DE', regionCode: null },
					translations: {
						language: 'en',
						translations: {},
					},
				},
				error: null,
				ok: true,
				response: null,
			}),
		setConsent: (options) => {
			// Add consent data to localStorage to simulate real storage
			try {
				const key = 'custom-handler-consent';
				const data = {
					preferences: options?.body?.preferences || {},
					timestamp: new Date().toISOString(),
				};
				localStorage.setItem(key, JSON.stringify(data));
			} catch {
				// Ignore localStorage errors
			}

			return {
				data: { success: true },
				error: null,
				ok: true,
				response: null,
			};
		},
		verifyConsent: () =>
			Promise.resolve({
				data: { valid: true },
				error: null,
				ok: true,
				response: null,
			}),
	};

	beforeEach(() => {
		localStorage.clear();

		// Spy on handlers
		vi.spyOn(handlers, 'init');
		vi.spyOn(handlers, 'setConsent');
		vi.spyOn(handlers, 'verifyConsent');
	});

	it('should use custom handlers in browser environment', async () => {
		// Configure the client
		const client = configureConsentManager(
			assignInOrder(
				{ mode: customMode },
				// @ts-expect-error Tests inject custom endpoint handlers.
				{ endpointHandlers: handlers }
			)
		) as CustomClient;

		// Call the API
		const response = await client.init();

		// Assertions
		expect(handlers.init).toHaveBeenCalledTimes(1);
		expect(response.ok).toBe(true);
		expect(response.data?.jurisdiction).toBe('GDPR');
	});

	it('should handle custom storage in browser', async () => {
		// Configure the client
		const client = configureConsentManager(
			assignInOrder(
				{ mode: customMode },
				// @ts-expect-error Tests inject custom endpoint handlers.
				{ endpointHandlers: handlers }
			)
		) as CustomClient;

		// Set consent data with custom handler
		await client.setConsent({
			body: {
				domain: 'example.com',
				preferences: {
					analytics: true,
					marketing: false,
				},
				type: 'cookie_banner',
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
			// @ts-expect-error Tests inject custom endpoint handlers.
			endpointHandlers: handlers,
		});

		// Define a dynamic handler
		const dynamicHandler = vi.fn().mockImplementation(() =>
			Promise.resolve({
				data: { custom: true },
				error: null,
				ok: true,
				response: null,
			})
		);

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
