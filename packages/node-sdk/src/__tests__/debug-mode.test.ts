/**
 * Tests for debug mode logging.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { c15tClient } from '../index';

describe('Debug Mode', () => {
	let originalApiUrl: string | undefined;
	let originalDebug: string | undefined;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		originalApiUrl = process.env.C15T_API_URL;
		originalDebug = process.env.C15T_DEBUG;
		delete process.env.C15T_API_URL;
		delete process.env.C15T_DEBUG;

		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		if (originalApiUrl === undefined) {
			delete process.env.C15T_API_URL;
		} else {
			process.env.C15T_API_URL = originalApiUrl;
		}
		if (originalDebug === undefined) {
			delete process.env.C15T_DEBUG;
		} else {
			process.env.C15T_DEBUG = originalDebug;
		}
		vi.restoreAllMocks();
	});

	describe('debug option', () => {
		it('should not log when debug is disabled', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ version: '1.0.0' }), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				debug: false,
			});

			await client.status();

			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it('should log when debug is enabled via options', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ version: '1.0.0' }), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				debug: true,
			});

			await client.status();

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const logCall = consoleLogSpy.mock.calls[0][0];
			expect(logCall).toContain('[c15t]');
			expect(logCall).toContain('GET');
			expect(logCall).toContain('/status');
			expect(logCall).toContain('200');
		});

		it('should log when debug is enabled via environment variable', async () => {
			process.env.C15T_DEBUG = 'true';

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ version: '1.0.0' }), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
			});

			await client.status();

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		});

		it('should prefer options over environment variable', async () => {
			process.env.C15T_DEBUG = 'true';

			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ version: '1.0.0' }), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			);
			globalThis.fetch = mockFetch;

			// Explicitly disable debug even though env var is true
			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				debug: false,
			});

			await client.status();

			expect(consoleLogSpy).not.toHaveBeenCalled();
		});
	});

	describe('log format', () => {
		it('should include timestamp, method, path, duration, and status', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ version: '1.0.0' }), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				debug: true,
			});

			await client.status();

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const logCall = consoleLogSpy.mock.calls[0][0];

			// Check format: [c15t] TIMESTAMP METHOD PATH (DURATIONms) -> STATUS
			expect(logCall).toMatch(
				/\[c15t\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z GET \/status \(\d+ms\) -> 200/u
			);
		});

		it('should log error responses', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Not found' }), {
					headers: { 'content-type': 'application/json' },
					status: 404,
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				debug: true,
			});

			await client.getSubject('sub_123');

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const logCall = consoleLogSpy.mock.calls[0][0];
			expect(logCall).toContain('404');
		});

		it('should log network errors', async () => {
			const mockFetch = vi
				.fn()
				.mockRejectedValueOnce(new Error('ECONNREFUSED'));
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				debug: true,
				retryConfig: { maxRetries: 0, retryOnNetworkError: false },
			});

			await client.status();

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const logCall = consoleLogSpy.mock.calls[0][0];
			expect(logCall).toContain('ERROR');
		});

		it('should log POST requests correctly', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({ consentId: 'con_456', subjectId: 'sub_123' }),
					{
						headers: { 'content-type': 'application/json' },
						status: 201,
					}
				)
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'https://api.example.com',
				debug: true,
			});

			await client.createSubject({
				domain: 'example.com',
				givenAt: Date.now(),
				preferences: {},
				subjectId: 'sub_123',
				type: 'cookie_banner',
			});

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const logCall = consoleLogSpy.mock.calls[0][0];
			expect(logCall).toContain('POST');
			expect(logCall).toContain('/subjects');
			expect(logCall).toContain('201');
		});
	});
});
