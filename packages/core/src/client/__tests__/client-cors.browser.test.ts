import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { C15tClient } from '../client-c15t';

/**
 * @vitest-environment jsdom
 */
describe('CORS functionality', () => {
	let originalFetch: typeof fetch;

	beforeEach(() => {
		originalFetch = window.fetch;
		// Use a simpler approach without storing the spy
		vi.spyOn(window, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
		window.fetch = originalFetch;
	});

	it('should set the correct CORS mode in fetch options', async () => {
		// Use a different CORS mode than the default
		const client = new C15tClient({
			backendURL: '/api/c15t',
			corsMode: 'same-origin',
		});

		// Mock the response
		vi.mocked(window.fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Make the request
		await client.showConsentBanner();

		// Verify the CORS mode was set correctly
		expect(window.fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				mode: 'same-origin',
			})
		);
	});

	it('should use default CORS mode when not specified', async () => {
		// Create client without specifying CORS mode
		const client = new C15tClient({
			backendURL: '/api/c15t',
		});

		// Mock the response
		vi.mocked(window.fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Make the request
		await client.showConsentBanner();

		// Verify the default CORS mode was used
		expect(window.fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				mode: 'cors', // Default mode
			})
		);
	});

	it('should include credentials in CORS requests by default', async () => {
		const client = new C15tClient({
			backendURL: '/api/c15t',
		});

		// Mock the response
		vi.mocked(window.fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Make the request
		await client.showConsentBanner();

		// Verify credentials are included
		expect(window.fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				credentials: 'include',
			})
		);
	});

	it('should handle CORS errors correctly', async () => {
		const client = new C15tClient({
			backendURL: '/api/c15t',
		});

		// Simulate a CORS error
		const corsError = new TypeError('Failed to fetch');
		vi.mocked(window.fetch).mockRejectedValueOnce(corsError);

		// Track error callback
		const onErrorMock = vi.fn();

		// Make the request
		const response = await client.showConsentBanner({
			onError: onErrorMock,
		});

		// Verify error handling
		expect(response.ok).toBe(false);
		expect(response.error?.code).toBe('NETWORK_ERROR');
		expect(onErrorMock).toHaveBeenCalledTimes(1);
	});

	it('should respect origin policy with CORS', async () => {
		const client = new C15tClient({
			backendURL: 'https://api.example.com/c15t',
			corsMode: 'cors',
		});

		// Mock the response with CORS headers
		vi.mocked(window.fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			})
		);

		// Make the request
		const response = await client.showConsentBanner();

		// Verify the request was properly configured and successful
		expect(window.fetch).toHaveBeenCalledWith(
			expect.stringContaining('https://api.example.com/c15t'),
			expect.objectContaining({
				mode: 'cors',
				credentials: 'include',
			})
		);
		expect(response.ok).toBe(true);
	});
});
