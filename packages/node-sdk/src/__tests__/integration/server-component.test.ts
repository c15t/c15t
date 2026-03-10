/**
 * Integration tests for server component usage patterns.
 *
 * These tests validate that the patterns demonstrated in examples/demo
 * work correctly with the node-sdk.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { C15TClient, c15tClient } from '../../index';

describe('Server Component Integration', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe('Client Instance Pattern', () => {
		it('should create a singleton client from environment variables', () => {
			// Simulate the pattern used in examples/demo/lib/c15t-client.ts
			const client = c15tClient({
				baseUrl:
					process.env.C15T_API_URL || 'http://localhost:3000/api/self-host',
			});

			expect(client).toBeInstanceOf(C15TClient);
		});

		it('should reuse the same client instance across multiple imports', () => {
			// In a real app, the module would be cached, giving the same instance
			const createClient = () =>
				c15tClient({
					baseUrl: 'http://localhost:3000/api/self-host',
				});

			const client1 = createClient();
			const client2 = createClient();

			// Both should be valid clients (in production, module caching handles singleton)
			expect(client1).toBeInstanceOf(C15TClient);
			expect(client2).toBeInstanceOf(C15TClient);
		});
	});

	describe('Consent Check Pattern', () => {
		it('should check consent and return structured response', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						results: {
							analytics: { hasConsent: true, isLatestPolicy: true },
						},
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'http://localhost:3000/api/self-host',
			});

			// Pattern used in server components
			const result = await client.checkConsent({
				externalId: 'user_123',
				type: 'analytics',
			});

			expect(result.ok).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.error).toBeNull();
		});

		it('should handle consent check errors gracefully', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						message: 'External ID not found',
						code: 'NOT_FOUND',
					}),
					{
						status: 404,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'http://localhost:3000/api/self-host',
			});

			const result = await client.checkConsent({
				externalId: 'nonexistent_user',
				type: 'analytics',
			});

			// Server component pattern: check result.ok before using data
			expect(result.ok).toBe(false);
			expect(result.error?.message).toBe('External ID not found');
			expect(result.error?.code).toBe('NOT_FOUND');
			expect(result.error?.status).toBe(404);
		});
	});

	describe('Create Subject Pattern', () => {
		it('should create subject with consent preferences', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						subjectId: 'sub_123',
						consentId: 'con_456',
						domainId: 'dom_789',
						domain: 'example.com',
						type: 'cookie_banner',
						status: 'active',
						recordId: 'rec_abc',
						givenAt: new Date().toISOString(),
					}),
					{
						status: 201,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'http://localhost:3000/api/self-host',
			});

			// Pattern used in API routes
			const result = await client.createSubject({
				type: 'cookie_banner',
				subjectId: 'sub_123',
				externalSubjectId: 'user_123',
				domain: 'example.com',
				preferences: { analytics: true, marketing: false },
				givenAt: Date.now(),
			});

			expect(result.ok).toBe(true);
			expect(result.data?.subjectId).toBe('sub_123');
		});

		it('should handle validation errors', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						message: 'Validation failed',
						code: 'VALIDATION_ERROR',
						details: { domain: ['Domain is required'] },
					}),
					{
						status: 400,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'http://localhost:3000/api/self-host',
			});

			const result = await client.createSubject({
				type: 'cookie_banner',
				subjectId: 'sub_123',
				domain: '',
				preferences: {},
				givenAt: Date.now(),
			});

			expect(result.ok).toBe(false);
			expect(result.error?.status).toBe(400);
			expect(result.error?.code).toBe('VALIDATION_ERROR');
		});
	});

	describe('Response Context Usage', () => {
		it('should provide all necessary fields for error handling', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({ message: 'Server error', code: 'INTERNAL_ERROR' }),
					{
						status: 500,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'http://localhost:3000/api/self-host',
				retryConfig: { maxRetries: 0 },
			});

			const result = await client.status();

			// All fields needed for server component error rendering
			expect(result).toHaveProperty('ok');
			expect(result).toHaveProperty('data');
			expect(result).toHaveProperty('error');
			expect(result).toHaveProperty('response');

			expect(result.ok).toBe(false);
			expect(result.error).toMatchObject({
				message: 'Server error',
				code: 'INTERNAL_ERROR',
				status: 500,
			});
		});

		it('should include response object for header access', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ version: '1.0.0' }), {
					status: 200,
					headers: {
						'content-type': 'application/json',
						'x-request-id': 'req_123',
					},
				})
			);
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'http://localhost:3000/api/self-host',
			});

			const result = await client.status();

			expect(result.ok).toBe(true);
			expect(result.response).not.toBeNull();
			expect(result.response?.headers.get('x-request-id')).toBe('req_123');
		});
	});

	describe('Network Error Handling', () => {
		it('should handle network errors without crashing', async () => {
			const mockFetch = vi
				.fn()
				.mockRejectedValueOnce(new Error('ECONNREFUSED'));
			globalThis.fetch = mockFetch;

			const client = c15tClient({
				baseUrl: 'http://localhost:3000/api/self-host',
				retryConfig: { maxRetries: 0, retryOnNetworkError: false },
			});

			const result = await client.status();

			expect(result.ok).toBe(false);
			expect(result.error?.code).toBe('NETWORK_ERROR');
			expect(result.error?.message).toContain('ECONNREFUSED');
		});
	});
});
