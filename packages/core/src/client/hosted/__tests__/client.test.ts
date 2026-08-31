import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchMock, mockLocalStorage } from '../../../../vitest.setup';
import { configureConsentManager } from '../../client-factory';
import type { ConsentManagerOptions } from '../../client-factory';
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
					jurisdiction: { code: 'EU', message: 'European Union' },
					location: { countryCode: 'DE', regionCode: null },
					showConsentBanner: true,
				}),
				{ headers: { 'Content-Type': 'application/json' }, status: 200 }
			)
		);

		// Configure the client
		const client = configureConsentManager({
			backendURL: '/api/c15t',
			mode: 'hosted',
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
			jurisdiction: { code: 'EU', message: 'European Union' },
			location: { countryCode: 'DE', regionCode: null },
			showConsentBanner: true,
		});
	});

	it('should handle errors gracefully', async () => {
		// Mock error response
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					code: 'SERVER_ERROR',
					message: 'Internal Server Error',
				}),
				{
					status: 500,
					statusText: 'Internal Server Error',
				}
			)
		);

		// Configure the client
		const client = configureConsentManager({
			backendURL: '/api/c15t',
			mode: 'hosted',
		});

		// Call the API - should fallback to offline mode
		const response = await client.init();

		// Assertions - should use offline fallback which returns ok: true
		// Offline fallback returns jurisdiction and location instead of showConsentBanner
		expect(response.ok).toBe(true);
		expect(response.data).toBeDefined();
		expect(response.data?.jurisdiction).toBeDefined();
	});

	it('should set consent preferences', async () => {
		// Mock successful response
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ success: true }), {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			})
		);

		// Configure the client
		const client = configureConsentManager({
			backendURL: '/api/c15t',
			mode: 'hosted',
		});

		// Consent preferences to set - v2.0 requires subjectId
		const consentData = {
			domain: 'example.com',
			givenAt: Date.now(),
			preferences: {
				analytics: true,
				marketing: false,
			},
			subjectId: 'sub_test123abc',
			type: 'cookie_banner' as const,
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
				body: JSON.stringify(consentData),
				method: 'POST',
			})
		);
		expect(response.ok).toBe(true);
		expect(response.data).toEqual({ success: true });
	});

	it('should include custom headers in requests', async () => {
		// Mock successful response
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			})
		);

		// Configure the client with custom headers and force a new instance
		const client = configureConsentManager({
			backendURL: 'https://test.example.com/api/c15t',
			headers: {
				Authorization: 'Bearer test-token',
				'X-Custom-Header': 'test-value',
			},
			mode: 'hosted',
		});

		// Call the API
		await client.init();

		// Verify fetch was called
		expect(fetchMock).toHaveBeenCalledTimes(1);

		// Get the actual call arguments
		// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
		const mockCall = fetchMock.mock.calls[0];
		// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
		const url = mockCall[0];
		// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
		const options = mockCall[1];

		// Check the URL
		expect(url).toContain('/api/c15t/init');

		// Check that our custom headers were included
		expect(options.headers['x-c15t-version']).toEqual(expect.any(String));
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
					headers: { 'Content-Type': 'application/json' },
					status: 200,
				})
			);

		// Configure client with retry config
		const config: ConsentManagerOptions = {
			backendURL: '/api/c15t',
			mode: 'hosted',
			retryConfig: {
				// Small delay for test
				initialDelayMs: 10,
				maxRetries: 1,
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
