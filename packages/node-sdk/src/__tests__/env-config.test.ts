/**
 * Tests for environment variable auto-configuration.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { C15TClient, c15tClient } from '../index';

describe('Environment Variable Configuration', () => {
	let originalApiUrl: string | undefined;
	let originalApiToken: string | undefined;

	beforeEach(() => {
		// Store original values
		originalApiUrl = process.env.C15T_API_URL;
		originalApiToken = process.env.C15T_API_TOKEN;
		// Clear env vars for clean test
		delete process.env.C15T_API_URL;
		delete process.env.C15T_API_TOKEN;
	});

	afterEach(() => {
		// Restore original values
		if (originalApiUrl !== undefined) {
			process.env.C15T_API_URL = originalApiUrl;
		} else {
			delete process.env.C15T_API_URL;
		}
		if (originalApiToken !== undefined) {
			process.env.C15T_API_TOKEN = originalApiToken;
		} else {
			delete process.env.C15T_API_TOKEN;
		}
		vi.restoreAllMocks();
	});

	describe('baseUrl configuration', () => {
		it('should use baseUrl from options when provided', () => {
			const client = c15tClient({
				baseUrl: 'https://api.example.com',
			});

			expect(client).toBeInstanceOf(C15TClient);
		});

		it('should fall back to C15T_API_URL environment variable', () => {
			process.env.C15T_API_URL = 'https://env.example.com';

			const client = c15tClient();

			expect(client).toBeInstanceOf(C15TClient);
		});

		it('should prefer options over environment variable', () => {
			process.env.C15T_API_URL = 'https://env.example.com';

			// This should not throw even though env var is set
			const client = c15tClient({
				baseUrl: 'https://options.example.com',
			});

			expect(client).toBeInstanceOf(C15TClient);
		});

		it('should throw when no baseUrl is provided and no env var', () => {
			delete process.env.C15T_API_URL;

			expect(() => c15tClient()).toThrow(
				'baseUrl is required. Provide it in options or set C15T_API_URL environment variable.'
			);
		});

		it('should throw for invalid baseUrl', () => {
			expect(() => c15tClient({ baseUrl: 'invalid-url' })).toThrow();
		});
	});

	describe('token configuration', () => {
		it('should use token from options when provided', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({}), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				token: 'options-token',
			});

			await client.status();

			const fetchCall = mockFetch.mock.calls[0];
			const headers = fetchCall[1].headers as Record<string, string>;
			expect(headers.Authorization).toBe('Bearer options-token');
		});

		it('should fall back to C15T_API_TOKEN environment variable', async () => {
			process.env.C15T_API_TOKEN = 'env-token';

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({}), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
			});

			await client.status();

			const fetchCall = mockFetch.mock.calls[0];
			const headers = fetchCall[1].headers as Record<string, string>;
			expect(headers.Authorization).toBe('Bearer env-token');
		});

		it('should prefer options token over environment variable', async () => {
			process.env.C15T_API_TOKEN = 'env-token';

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({}), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				token: 'options-token',
			});

			await client.status();

			const fetchCall = mockFetch.mock.calls[0];
			const headers = fetchCall[1].headers as Record<string, string>;
			expect(headers.Authorization).toBe('Bearer options-token');
		});

		it('should not include Authorization header when no token', async () => {
			delete process.env.C15T_API_TOKEN;

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({}), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
			});

			await client.status();

			const fetchCall = mockFetch.mock.calls[0];
			const headers = fetchCall[1].headers as Record<string, string>;
			expect(headers.Authorization).toBeUndefined();
		});
	});

	describe('zero-config setup', () => {
		it('should work with only environment variables', async () => {
			process.env.C15T_API_URL = 'https://api.example.com';
			process.env.C15T_API_TOKEN = 'test-token';

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ version: '1.0.0' }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			// Zero-config: no options needed
			const client = c15tClient();
			const result = await client.status();

			expect(result.ok).toBe(true);
			expect(mockFetch).toHaveBeenCalled();

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('api.example.com');
			const headers = fetchCall[1].headers as Record<string, string>;
			expect(headers.Authorization).toBe('Bearer test-token');
		});
	});
});
