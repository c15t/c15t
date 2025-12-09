import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../vitest.setup';
import { configureConsentManager } from '../client-factory';
import { CustomClient } from '../custom';

describe('Custom Client Tests', () => {
	// Mocks for custom handlers
	const initMock = vi.fn();
	const setConsentMock = vi.fn();
	const verifyConsentMock = vi.fn();
	const identifyUserMock = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
		mockLocalStorage.clear();

		// Set up default responses for the mock handlers
		initMock.mockResolvedValue({
			data: {
				jurisdiction: 'GDPR',
				location: { countryCode: 'DE', regionCode: null },
				translations: {
					language: 'en',
					translations: {},
				},
				branding: 'c15t',
			},
			ok: true,
			error: null,
			response: null,
		});

		setConsentMock.mockResolvedValue({
			data: { success: true },
			ok: true,
			error: null,
			response: null,
		});

		verifyConsentMock.mockResolvedValue({
			data: { valid: true },
			ok: true,
			error: null,
			response: null,
		});
	});

	it('should use custom handler for init', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'custom',
			endpointHandlers: {
				init: initMock,
				setConsent: setConsentMock,
				verifyConsent: verifyConsentMock,
				identifyUser: identifyUserMock,
			},
		});

		// Call the API
		const response = await client.init();

		// Assertions
		expect(initMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.ok).toBe(true);
		expect(response.data).toEqual({
			jurisdiction: 'GDPR',
			location: { countryCode: 'DE', regionCode: null },
			translations: {
				language: 'en',
				translations: {},
			},
			branding: 'c15t',
		});
	});

	it('should pass options to custom handlers', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'custom',
			endpointHandlers: {
				init: initMock,
				setConsent: setConsentMock,
				verifyConsent: verifyConsentMock,
				identifyUser: identifyUserMock,
			},
		});

		// Consent preferences to set
		const consentData = {
			domain: 'example.com',
			preferences: {
				analytics: true,
				marketing: false,
			},
			type: 'cookie_banner' as const,
		};

		// Call the API
		await client.setConsent({
			body: consentData,
		});

		// Assertions
		expect(setConsentMock).toHaveBeenCalledTimes(1);
		expect(setConsentMock).toHaveBeenCalledWith(
			expect.objectContaining({
				body: consentData,
			})
		);
	});

	it('should handle errors in custom handlers', async () => {
		// Mock error response
		setConsentMock.mockResolvedValueOnce({
			data: null,
			ok: false,
			error: {
				message: 'Custom Error',
				status: 400,
				code: 'CUSTOM_ERROR',
			},
			response: null,
		});

		// Configure the client
		const client = configureConsentManager({
			mode: 'custom',
			endpointHandlers: {
				init: initMock,
				setConsent: setConsentMock,
				verifyConsent: verifyConsentMock,
				identifyUser: identifyUserMock,
			},
		});

		// Call the API
		const response = await client.setConsent();

		// Assertions
		expect(response.ok).toBe(false);
		expect(response.error).toBeDefined();
		expect(response.error?.message).toBe('Custom Error');
		expect(response.error?.code).toBe('CUSTOM_ERROR');
	});

	it('should use a dynamic handler registered with registerHandler', async () => {
		// Custom handler for dynamic endpoint
		const customDynamicHandler = vi.fn().mockResolvedValue({
			data: { customData: true },
			ok: true,
			error: null,
			response: null,
		});

		// Configure the client
		const client = new CustomClient({
			endpointHandlers: {
				init: initMock,
				setConsent: setConsentMock,
				verifyConsent: verifyConsentMock,
				identifyUser: identifyUserMock,
			},
		});

		// Register a dynamic handler
		client.registerHandler('/custom-endpoint', customDynamicHandler);

		// Call the API with custom endpoint
		const response = await client.$fetch('/custom-endpoint');

		// Assertions
		expect(customDynamicHandler).toHaveBeenCalledTimes(1);
		expect(response.ok).toBe(true);
		expect(response.data).toEqual({ customData: true });
	});
});
