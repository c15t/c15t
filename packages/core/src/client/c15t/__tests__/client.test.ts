import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../../vitest.setup';
import {
	type ConsentManagerOptions,
	configureConsentManager,
} from '../../client-factory';
import { API_ENDPOINTS } from '../../types';

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
		const response = await client.init();

		// Assertions
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t/init'),
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

		// Call the API - should fallback to offline mode
		const response = await client.init();

		// Assertions - should use offline fallback which returns ok: true
		expect(response.ok).toBe(true);
		expect(response.data).toBeDefined();
		expect(response.data?.showConsentBanner).toBeDefined();
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

		// Consent preferences to set - v2.0 requires subjectId
		const consentData = {
			subjectId: 'sub_test123abc',
			type: 'cookie_banner' as const,
			domain: 'example.com',
			givenAt: Date.now(),
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
		// v2.0: Uses POST /subjects endpoint
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining(API_ENDPOINTS.POST_SUBJECT),
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

		// Configure the client with custom headers and force a new instance
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: 'https://test.example.com/api/c15t',
			headers: {
				'X-Custom-Header': 'test-value',
				Authorization: 'Bearer test-token',
			},
		});

		// Call the API
		await client.init();

		// Verify fetch was called
		expect(fetchMock).toHaveBeenCalledTimes(1);

		// Get the actual call arguments
		const mockCall = fetchMock.mock.calls[0];
		const url = mockCall[0];
		const options = mockCall[1];

		// Check the URL
		expect(url).toContain('/api/c15t/init');

		// Check that our custom headers were included
		expect(options.headers['X-Custom-Header']).toBe('test-value');
		expect(options.headers.Authorization).toBe('Bearer test-token');
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
		const response = await client.init();

		// Assertions
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(response.ok).toBe(true);
		expect(response.data).toEqual({ showConsentBanner: true });
	});
});
