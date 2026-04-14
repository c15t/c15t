/**
 * Tests for Result type helpers on ResponseContext.
 */

import { describe, expect, it } from 'vitest';
import { C15TError } from '../error';
import { createResponseContext } from '../fetcher';

describe('Result Type Helpers', () => {
	describe('unwrap', () => {
		it('should return data when response is successful', () => {
			const context = createResponseContext(true, { id: 'test' });
			expect(context.unwrap()).toEqual({ id: 'test' });
		});

		it('should throw C15TError when response is not successful', () => {
			const context = createResponseContext(false, null, {
				message: 'Not found',
				status: 404,
				code: 'NOT_FOUND',
			});

			try {
				context.unwrap();
			} catch (error) {
				expect(error).toBeInstanceOf(C15TError);
				const c15tError = error as C15TError;
				expect(c15tError.message).toBe('Not found');
				expect(c15tError.status).toBe(404);
				expect(c15tError.code).toBe('NOT_FOUND');
			}
		});

		it('should throw with default message when no error message', () => {
			const context = createResponseContext(false, null);
			expect(() => context.unwrap()).toThrow('Request failed');
		});

		it('should throw when data is null even if ok is true', () => {
			const context = createResponseContext(true, null);
			expect(() => context.unwrap()).toThrow('Request failed');
		});

		it('should preserve error details in thrown C15TError', () => {
			const context = createResponseContext(false, null, {
				message: 'Validation failed',
				status: 400,
				code: 'VALIDATION_ERROR',
				details: { field: 'email' },
			});

			try {
				context.unwrap();
			} catch (error) {
				const c15tError = error as C15TError;
				expect(c15tError.details).toEqual({ field: 'email' });
			}
		});
	});

	describe('unwrapOr', () => {
		it('should return data when response is successful', () => {
			const context = createResponseContext(true, { id: 'actual' });
			const result = context.unwrapOr({ id: 'default' });
			expect(result).toEqual({ id: 'actual' });
		});

		it('should return default value when response is not successful', () => {
			const context = createResponseContext<{ id: string }>(false, null, {
				message: 'Error',
				status: 500,
			});
			const result = context.unwrapOr({ id: 'default' });
			expect(result).toEqual({ id: 'default' });
		});

		it('should return default value when data is null', () => {
			const context = createResponseContext<{ id: string }>(true, null);
			const result = context.unwrapOr({ id: 'default' });
			expect(result).toEqual({ id: 'default' });
		});
	});

	describe('expect', () => {
		it('should return data when response is successful', () => {
			const context = createResponseContext(true, { id: 'test' });
			expect(context.expect('Custom message')).toEqual({ id: 'test' });
		});

		it('should throw C15TError with custom message when response is not successful', () => {
			const context = createResponseContext(false, null, {
				message: 'Original error',
				status: 404,
				code: 'NOT_FOUND',
			});

			try {
				context.expect('Subject not found');
			} catch (error) {
				expect(error).toBeInstanceOf(C15TError);
				const c15tError = error as C15TError;
				expect(c15tError.message).toBe('Subject not found');
				expect(c15tError.status).toBe(404);
				expect(c15tError.code).toBe('NOT_FOUND');
			}
		});

		it('should throw custom message when data is null', () => {
			const context = createResponseContext(true, null);
			expect(() => context.expect('Data was null')).toThrow('Data was null');
		});
	});

	describe('map', () => {
		it('should transform data when response is successful', () => {
			const context = createResponseContext(true, { name: 'John', age: 30 });
			const mapped = context.map((data) => data.name);

			expect(mapped.ok).toBe(true);
			expect(mapped.data).toBe('John');
		});

		it('should preserve error when response is not successful', () => {
			const context = createResponseContext<{ name: string }>(false, null, {
				message: 'Not found',
				status: 404,
				code: 'NOT_FOUND',
			});
			const mapped = context.map((data) => data.name);

			expect(mapped.ok).toBe(false);
			expect(mapped.data).toBeNull();
			expect(mapped.error?.message).toBe('Not found');
			expect(mapped.error?.code).toBe('NOT_FOUND');
		});

		it('should handle complex transformations', () => {
			interface Subject {
				id: string;
				consents: { type: string; granted: boolean }[];
			}

			const context = createResponseContext<Subject>(true, {
				id: 'sub_123',
				consents: [
					{ type: 'analytics', granted: true },
					{ type: 'marketing', granted: false },
				],
			});

			const grantedTypes = context.map((data) =>
				data.consents.filter((c) => c.granted).map((c) => c.type)
			);

			expect(grantedTypes.data).toEqual(['analytics']);
		});

		it('should be chainable', () => {
			const context = createResponseContext(true, { count: 5 });
			const result = context
				.map((data) => data.count * 2)
				.map((count) => `Count: ${count}`);

			expect(result.data).toBe('Count: 10');
		});

		it('should preserve response object through map', () => {
			const mockResponse = new Response('{}', { status: 200 });
			const context = createResponseContext(
				true,
				{ id: 'test' },
				null,
				mockResponse
			);
			const mapped = context.map((data) => data.id);

			expect(mapped.response).toBe(mockResponse);
		});
	});

	describe('chaining helpers', () => {
		it('should work with Promise.then for ergonomic API usage', async () => {
			// Simulating: client.getSubject('id').then(r => r.unwrap())
			const promiseContext = Promise.resolve(
				createResponseContext(true, { id: 'sub_123' })
			);

			const result = await promiseContext.then((r) => r.unwrap());
			expect(result).toEqual({ id: 'sub_123' });
		});

		it('should work with async/await pattern', async () => {
			const promiseContext = Promise.resolve(
				createResponseContext(true, { id: 'sub_123' })
			);

			const response = await promiseContext;
			const data = response.unwrapOr({ id: 'default' });
			expect(data).toEqual({ id: 'sub_123' });
		});
	});
});
