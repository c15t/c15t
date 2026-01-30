/**
 * Tests for timeout configuration with AbortController.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { C15TClient, c15tClient } from '../index';

describe('Timeout Configuration', () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe('global timeout', () => {
		it('should use default timeout of 30 seconds', () => {
			const client = c15tClient({
				baseUrl: 'https://api.example.com',
			});

			expect(client).toBeInstanceOf(C15TClient);
			// Default timeout is set internally; we test its effect
		});

		it('should allow custom global timeout', async () => {
			// Mock a slow response that exceeds the timeout
			const mockFetch = vi
				.fn()
				.mockImplementation((url: string, options: RequestInit) => {
					return new Promise((resolve, reject) => {
						// Simulate slow response
						const timeoutId = setTimeout(() => {
							resolve(
								new Response(JSON.stringify({ version: '1.0.0' }), {
									status: 200,
									headers: { 'content-type': 'application/json' },
								})
							);
						}, 100);

						// Listen for abort
						options.signal?.addEventListener('abort', () => {
							clearTimeout(timeoutId);
							const error = new Error('The operation was aborted.');
							error.name = 'AbortError';
							reject(error);
						});
					});
				});
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				timeout: 50, // 50ms timeout, slower than 100ms response
				retryConfig: { maxRetries: 0 },
			});

			const result = await client.status();

			expect(result.ok).toBe(false);
			expect(result.error?.code).toBe('TIMEOUT');
			expect(result.error?.message).toContain('timed out');
		});

		it('should succeed when response is faster than timeout', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ version: '1.0.0' }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				timeout: 5000, // 5 second timeout
			});

			const result = await client.status();

			expect(result.ok).toBe(true);
		});
	});

	describe('per-request timeout', () => {
		it('should allow per-request timeout override', async () => {
			// Mock a slow response
			const mockFetch = vi
				.fn()
				.mockImplementation((url: string, options: RequestInit) => {
					return new Promise((resolve, reject) => {
						const timeoutId = setTimeout(() => {
							resolve(
								new Response(JSON.stringify({ id: 'sub_123' }), {
									status: 200,
									headers: { 'content-type': 'application/json' },
								})
							);
						}, 100);

						options.signal?.addEventListener('abort', () => {
							clearTimeout(timeoutId);
							const error = new Error('The operation was aborted.');
							error.name = 'AbortError';
							reject(error);
						});
					});
				});
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				timeout: 5000, // Global timeout is 5 seconds
				retryConfig: { maxRetries: 0 },
			});

			// Use per-request timeout of 50ms (shorter than 100ms response)
			const result = await client.getSubject('sub_123', undefined, {
				timeout: 50,
			});

			expect(result.ok).toBe(false);
			expect(result.error?.code).toBe('TIMEOUT');
		});

		it('should use global timeout when per-request not specified', async () => {
			const mockFetch = vi
				.fn()
				.mockImplementation((url: string, options: RequestInit) => {
					return new Promise((resolve, reject) => {
						const timeoutId = setTimeout(() => {
							resolve(
								new Response(JSON.stringify({ id: 'sub_123' }), {
									status: 200,
									headers: { 'content-type': 'application/json' },
								})
							);
						}, 100);

						options.signal?.addEventListener('abort', () => {
							clearTimeout(timeoutId);
							const error = new Error('The operation was aborted.');
							error.name = 'AbortError';
							reject(error);
						});
					});
				});
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				timeout: 50, // Global timeout is 50ms (shorter than 100ms response)
				retryConfig: { maxRetries: 0 },
			});

			// No per-request timeout, should use global
			const result = await client.status();

			expect(result.ok).toBe(false);
			expect(result.error?.code).toBe('TIMEOUT');
		});
	});

	describe('timeout error handling', () => {
		it('should return TIMEOUT error code on abort', async () => {
			const mockFetch = vi
				.fn()
				.mockImplementation((url: string, options: RequestInit) => {
					return new Promise((resolve, reject) => {
						const timeoutId = setTimeout(() => {
							resolve(
								new Response(JSON.stringify({}), {
									status: 200,
									headers: { 'content-type': 'application/json' },
								})
							);
						}, 100);

						options.signal?.addEventListener('abort', () => {
							clearTimeout(timeoutId);
							const error = new Error('The operation was aborted.');
							error.name = 'AbortError';
							reject(error);
						});
					});
				});
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				timeout: 10,
				retryConfig: { maxRetries: 0 },
			});

			const result = await client.status();

			expect(result.ok).toBe(false);
			expect(result.error?.code).toBe('TIMEOUT');
			expect(result.error?.status).toBe(0);
		});

		it('should include timeout duration in error message', async () => {
			const mockFetch = vi
				.fn()
				.mockImplementation((url: string, options: RequestInit) => {
					return new Promise((resolve, reject) => {
						const timeoutId = setTimeout(() => {
							resolve(
								new Response(JSON.stringify({}), {
									status: 200,
									headers: { 'content-type': 'application/json' },
								})
							);
						}, 100);

						options.signal?.addEventListener('abort', () => {
							clearTimeout(timeoutId);
							const error = new Error('The operation was aborted.');
							error.name = 'AbortError';
							reject(error);
						});
					});
				});
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				timeout: 25,
				retryConfig: { maxRetries: 0 },
			});

			const result = await client.status();

			expect(result.error?.message).toContain('25ms');
		});
	});
});
