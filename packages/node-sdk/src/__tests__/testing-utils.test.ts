/**
 * Tests for testing utilities.
 */

import { describe, expect, it } from 'vitest';

import {
	createMockClient,
	createMockErrorResponse,
	createMockResponse,
} from '../testing';

describe('Testing Utilities', () => {
	describe('createMockResponse', () => {
		it('should create successful response with data', () => {
			const response = createMockResponse({ id: 'sub_123', name: 'Test' });

			expect(response.ok).toBe(true);
			expect(response.data).toEqual({ id: 'sub_123', name: 'Test' });
			expect(response.error).toBeNull();
		});

		it('should support unwrap method', () => {
			const response = createMockResponse({ id: 'sub_123' });

			expect(response.unwrap()).toEqual({ id: 'sub_123' });
		});

		it('should support unwrapOr method', () => {
			const response = createMockResponse({ id: 'sub_123' });

			expect(response.unwrapOr({ id: 'default' })).toEqual({ id: 'sub_123' });
		});

		it('should support expect method', () => {
			const response = createMockResponse({ id: 'sub_123' });

			expect(response.expect('Should have data')).toEqual({ id: 'sub_123' });
		});

		it('should support map method', () => {
			const response = createMockResponse({ count: 5, id: 'sub_123' });
			const mapped = response.map((data) => data.count * 2);

			expect(mapped.data).toBe(10);
		});

		it('should create error response when ok is false', () => {
			const response = createMockResponse(null, {
				error: {
					code: 'NOT_FOUND',
					message: 'Not found',
					status: 404,
				},
				ok: false,
			});

			expect(response.ok).toBe(false);
			expect(response.data).toBeNull();
			expect(response.error?.message).toBe('Not found');
			expect(response.error?.status).toBe(404);
		});
	});

	describe('createMockErrorResponse', () => {
		it('should create error response', () => {
			const response = createMockErrorResponse({
				code: 'VALIDATION_ERROR',
				message: 'Validation failed',
				status: 400,
			});

			expect(response.ok).toBe(false);
			expect(response.error?.message).toBe('Validation failed');
			expect(response.error?.status).toBe(400);
			expect(response.error?.code).toBe('VALIDATION_ERROR');
		});

		it('should throw on unwrap', () => {
			const response = createMockErrorResponse({
				message: 'Not found',
				status: 404,
			});

			expect(() => response.unwrap()).toThrow('Not found');
		});

		it('should return default on unwrapOr', () => {
			const response = createMockErrorResponse<{ id: string }>({
				message: 'Not found',
				status: 404,
			});

			expect(response.unwrapOr({ id: 'default' })).toEqual({ id: 'default' });
		});
	});

	describe('createMockClient', () => {
		it('should create mock client with default implementations', async () => {
			const mockClient = createMockClient();

			const result = await mockClient.status();

			expect(result.ok).toBe(false);
			expect(result.error?.code).toBe('NOT_IMPLEMENTED');
		});

		it('should allow overriding specific methods', async () => {
			const mockClient = createMockClient({
				getSubject: (id) =>
					createMockResponse({
						externalId: 'user_123',
						id,
					}),
			});

			const result = await mockClient.getSubject('sub_456');

			expect(result.ok).toBe(true);
			expect(result.data?.id).toBe('sub_456');
		});

		it('should support namespaced methods', async () => {
			const mockClient = createMockClient({
				checkConsent: () =>
					createMockResponse({
						results: { analytics: { hasConsent: true } },
					}),
			});

			const result = await mockClient.consent.check({
				externalId: 'user_123',
				type: 'analytics',
			});

			expect(result.ok).toBe(true);
		});

		it('should support subjects namespace', async () => {
			const mockClient = createMockClient({
				createSubject: (_input) =>
					createMockResponse({
						consentId: 'con_456',
						subjectId: 'sub_123',
					}),
				listSubjects: () =>
					createMockResponse({
						items: [],
						total: 0,
					}),
			});

			const createResult = await mockClient.subjects.create({
				domain: 'example.com',
				subjectId: 'sub_123',
				type: 'cookie_banner',
			});

			expect(createResult.ok).toBe(true);
			expect(createResult.data?.subjectId).toBe('sub_123');

			const listResult = await mockClient.subjects.list();

			expect(listResult.ok).toBe(true);
		});

		it('should support meta namespace', async () => {
			const mockClient = createMockClient({
				init: () =>
					createMockResponse({
						clientId: 'client_123',
					}),
				status: () =>
					createMockResponse({
						healthy: true,

						version: '1.0.0',
					}),
			});

			const statusResult = await mockClient.meta.status();
			const initResult = await mockClient.meta.init();

			expect(statusResult.ok).toBe(true);
			expect(initResult.ok).toBe(true);
		});

		it('should work with error responses', async () => {
			const mockClient = createMockClient({
				getSubject: () =>
					createMockErrorResponse({
						code: 'NOT_FOUND',
						message: 'Subject not found',
						status: 404,
					}),
			});

			const result = await mockClient.getSubject('nonexistent');

			expect(result.ok).toBe(false);
			expect(result.error?.status).toBe(404);
		});
	});

	describe('integration example', () => {
		it('demonstrates typical test usage', async () => {
			// Setup mock client
			const mockClient = createMockClient({
				checkConsent: () =>
					createMockResponse({
						results: {
							analytics: { hasConsent: true, isLatestPolicy: true },
							marketing: { hasConsent: false, isLatestPolicy: true },
						},
					}),
			});

			// Use in test
			const result = await mockClient.consent.check({
				externalId: 'user_123',
			});

			// Assertions
			expect(result.ok).toBe(true);
			expect(result.data?.results.analytics.hasConsent).toBe(true);
			expect(result.data?.results.marketing.hasConsent).toBe(false);
		});
	});
});
