import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FetcherContext } from '../fetcher';
import {
	createResponseContext,
	DEFAULT_RETRY_CONFIG,
	fetcher,
	resolveUrl,
} from '../fetcher';

describe('Fetcher', () => {
	describe('resolveUrl', () => {
		it('should resolve URL with trailing slash in base', () => {
			const result = resolveUrl('https://api.example.com/', '/status');
			expect(result).toBe('https://api.example.com/status');
		});

		it('should resolve URL without trailing slash in base', () => {
			const result = resolveUrl('https://api.example.com', '/status');
			expect(result).toBe('https://api.example.com/status');
		});

		it('should resolve URL without leading slash in path', () => {
			const result = resolveUrl('https://api.example.com', 'status');
			expect(result).toBe('https://api.example.com/status');
		});

		it('should handle nested paths', () => {
			const result = resolveUrl(
				'https://api.example.com/api/v1',
				'subjects/123'
			);
			expect(result).toBe('https://api.example.com/api/v1/subjects/123');
		});
	});

	describe('createResponseContext', () => {
		it('should create a success response context', () => {
			const data = { id: '123', name: 'test' };
			const response = new Response(JSON.stringify(data), { status: 200 });

			const context = createResponseContext(true, data, null, response);

			expect(context.ok).toBe(true);
			expect(context.data).toEqual(data);
			expect(context.error).toBeNull();
			expect(context.response).toBe(response);
		});

		it('should create an error response context', () => {
			const error = {
				message: 'Not found',
				status: 404,
				code: 'NOT_FOUND',
			};
			const response = new Response(null, { status: 404 });

			const context = createResponseContext(false, null, error, response);

			expect(context.ok).toBe(false);
			expect(context.data).toBeNull();
			expect(context.error).toEqual(error);
			expect(context.response).toBe(response);
		});

		it('should create a network error response context', () => {
			const error = {
				message: 'Network error',
				status: 0,
				code: 'NETWORK_ERROR',
			};

			const context = createResponseContext(false, null, error, null);

			expect(context.ok).toBe(false);
			expect(context.data).toBeNull();
			expect(context.error).toEqual(error);
			expect(context.response).toBeNull();
		});
	});

	describe('DEFAULT_RETRY_CONFIG', () => {
		it('should have default values', () => {
			expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
			expect(DEFAULT_RETRY_CONFIG.initialDelayMs).toBe(100);
			expect(DEFAULT_RETRY_CONFIG.backoffFactor).toBe(2);
			expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toEqual([
				500, 502, 503, 504,
			]);
			expect(DEFAULT_RETRY_CONFIG.nonRetryableStatusCodes).toEqual([
				400, 401, 403, 404,
			]);
			expect(DEFAULT_RETRY_CONFIG.retryOnNetworkError).toBe(true);
		});
	});

	describe('fetcher', () => {
		const originalFetch = globalThis.fetch;

		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		afterEach(() => {
			globalThis.fetch = originalFetch;
			vi.restoreAllMocks();
		});

		it('should make a successful GET request', async () => {
			const context: FetcherContext = {
				baseUrl: 'https://api.example.com',
				headers: {},
				retryConfig: {},
			};

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const result = await fetcher(context, '/test');

			expect(result.ok).toBe(true);
			expect(result.data).toEqual({ success: true });
		});

		it('should make a POST request with body', async () => {
			const context: FetcherContext = {
				baseUrl: 'https://api.example.com',
				headers: {},
				retryConfig: {},
			};

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ id: '123' }), {
					status: 201,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const result = await fetcher(context, '/subjects', {
				method: 'POST',
				body: { name: 'Test' },
			});

			expect(result.ok).toBe(true);
			expect(result.data).toEqual({ id: '123' });
		});

		it('should add query parameters to URL', async () => {
			const context: FetcherContext = {
				baseUrl: 'https://api.example.com',
				headers: {},
				retryConfig: {},
			};

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({}), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			await fetcher(context, '/test', {
				query: { foo: 'bar', baz: '123' },
			});

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('foo=bar');
			expect(fetchCall[0]).toContain('baz=123');
		});

		it('should handle 404 error without retry', async () => {
			const context: FetcherContext = {
				baseUrl: 'https://api.example.com',
				headers: {},
				retryConfig: { maxRetries: 3 },
			};

			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ message: 'Not found' }), {
					status: 404,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const result = await fetcher(context, '/not-found');

			expect(result.ok).toBe(false);
			expect(result.error?.status).toBe(404);
			expect(mockFetch.mock.calls.length).toBe(1); // No retries for 404
		});

		it('should retry on 500 error', async () => {
			const context: FetcherContext = {
				baseUrl: 'https://api.example.com',
				headers: {},
				retryConfig: {
					maxRetries: 2,
					initialDelayMs: 10,
					backoffFactor: 2,
				},
			};

			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ message: 'Server error' }), {
						status: 500,
						headers: { 'content-type': 'application/json' },
					})
				)
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ message: 'Server error' }), {
						status: 500,
						headers: { 'content-type': 'application/json' },
					})
				)
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					})
				);
			globalThis.fetch = mockFetch;

			const result = await fetcher(context, '/flaky');

			expect(result.ok).toBe(true);
			expect(mockFetch.mock.calls.length).toBe(3);
		});

		it('should call onSuccess callback on success', async () => {
			const context: FetcherContext = {
				baseUrl: 'https://api.example.com',
				headers: {},
				retryConfig: {},
			};

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const onSuccess = vi.fn();

			await fetcher(context, '/test', { onSuccess });

			expect(onSuccess).toHaveBeenCalledOnce();
			expect(onSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					ok: true,
					data: { success: true },
				})
			);
		});

		it('should call onError callback on error', async () => {
			const context: FetcherContext = {
				baseUrl: 'https://api.example.com',
				headers: {},
				retryConfig: {},
			};

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Bad request' }), {
					status: 400,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const onError = vi.fn();

			await fetcher(context, '/test', { onError });

			expect(onError).toHaveBeenCalledOnce();
			expect(onError).toHaveBeenCalledWith(
				expect.objectContaining({
					ok: false,
				}),
				'/test'
			);
		});

		it('should throw error when throw option is true', async () => {
			const context: FetcherContext = {
				baseUrl: 'https://api.example.com',
				headers: {},
				retryConfig: {},
			};

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Bad request' }), {
					status: 400,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			await expect(
				fetcher(context, '/test', { throw: true })
			).rejects.toThrow();
		});

		it('should include custom headers in request', async () => {
			const context: FetcherContext = {
				baseUrl: 'https://api.example.com',
				headers: { Authorization: 'Bearer token123' },
				retryConfig: {},
			};

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({}), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			await fetcher(context, '/test', {
				headers: { 'X-Custom': 'value' },
			});

			const fetchCall = mockFetch.mock.calls[0];
			const requestInit = fetchCall[1] as RequestInit;
			const headers = requestInit.headers as Record<string, string>;

			expect(headers['Authorization']).toBe('Bearer token123');
			expect(headers['X-Custom']).toBe('value');
		});
	});
});
