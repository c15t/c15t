/**
 * Tests for C15TError custom error class.
 */

import { describe, expect, it } from 'vitest';
import { C15TError, isC15TError } from '../error';

describe('C15TError', () => {
	describe('constructor', () => {
		it('should create error with all properties', () => {
			const error = new C15TError({
				message: 'Not found',
				status: 404,
				code: 'NOT_FOUND',
				details: { id: 'sub_123' },
				cause: new Error('Original error'),
			});

			expect(error.message).toBe('Not found');
			expect(error.status).toBe(404);
			expect(error.code).toBe('NOT_FOUND');
			expect(error.details).toEqual({ id: 'sub_123' });
			expect(error.cause).toBeInstanceOf(Error);
		});

		it('should create error with minimal properties', () => {
			const error = new C15TError({
				message: 'Server error',
				status: 500,
			});

			expect(error.message).toBe('Server error');
			expect(error.status).toBe(500);
			expect(error.code).toBeUndefined();
			expect(error.details).toBeUndefined();
		});

		it('should have correct name', () => {
			const error = new C15TError({ message: 'Test', status: 400 });
			expect(error.name).toBe('C15TError');
		});

		it('should be instance of Error', () => {
			const error = new C15TError({ message: 'Test', status: 400 });
			expect(error).toBeInstanceOf(Error);
		});
	});

	describe('status checks', () => {
		it('isStatus should match specific status codes', () => {
			const error = new C15TError({ message: 'Test', status: 429 });
			expect(error.isStatus(429)).toBe(true);
			expect(error.isStatus(404)).toBe(false);
		});

		it('isNotFound should detect 404 status', () => {
			const error404 = new C15TError({ message: 'Not found', status: 404 });
			const errorCode = new C15TError({
				message: 'Not found',
				status: 400,
				code: 'NOT_FOUND',
			});
			const other = new C15TError({ message: 'Bad request', status: 400 });

			expect(error404.isNotFound()).toBe(true);
			expect(errorCode.isNotFound()).toBe(true);
			expect(other.isNotFound()).toBe(false);
		});

		it('isValidationError should detect 400 status', () => {
			const error400 = new C15TError({
				message: 'Validation error',
				status: 400,
			});
			const errorCode = new C15TError({
				message: 'Invalid',
				status: 422,
				code: 'VALIDATION_ERROR',
			});
			const other = new C15TError({ message: 'Not found', status: 404 });

			expect(error400.isValidationError()).toBe(true);
			expect(errorCode.isValidationError()).toBe(true);
			expect(other.isValidationError()).toBe(false);
		});

		it('isUnauthorized should detect 401 status', () => {
			const error401 = new C15TError({ message: 'Unauthorized', status: 401 });
			const errorCode = new C15TError({
				message: 'Auth failed',
				status: 400,
				code: 'UNAUTHORIZED',
			});

			expect(error401.isUnauthorized()).toBe(true);
			expect(errorCode.isUnauthorized()).toBe(true);
		});

		it('isForbidden should detect 403 status', () => {
			const error403 = new C15TError({ message: 'Forbidden', status: 403 });
			const errorCode = new C15TError({
				message: 'Access denied',
				status: 400,
				code: 'FORBIDDEN',
			});

			expect(error403.isForbidden()).toBe(true);
			expect(errorCode.isForbidden()).toBe(true);
		});

		it('isServerError should detect 5xx status', () => {
			const error500 = new C15TError({ message: 'Internal', status: 500 });
			const error502 = new C15TError({ message: 'Bad gateway', status: 502 });
			const error503 = new C15TError({ message: 'Unavailable', status: 503 });
			const error400 = new C15TError({ message: 'Bad request', status: 400 });

			expect(error500.isServerError()).toBe(true);
			expect(error502.isServerError()).toBe(true);
			expect(error503.isServerError()).toBe(true);
			expect(error400.isServerError()).toBe(false);
		});

		it('isNetworkError should detect network failures', () => {
			const errorStatus0 = new C15TError({
				message: 'Network failed',
				status: 0,
			});
			const errorCode = new C15TError({
				message: 'Network error',
				status: 0,
				code: 'NETWORK_ERROR',
			});
			const other = new C15TError({ message: 'Server error', status: 500 });

			expect(errorStatus0.isNetworkError()).toBe(true);
			expect(errorCode.isNetworkError()).toBe(true);
			expect(other.isNetworkError()).toBe(false);
		});
	});

	describe('toJSON', () => {
		it('should serialize error to JSON', () => {
			const error = new C15TError({
				message: 'Not found',
				status: 404,
				code: 'NOT_FOUND',
				details: { resource: 'subject' },
			});

			const json = error.toJSON();

			expect(json).toEqual({
				name: 'C15TError',
				message: 'Not found',
				status: 404,
				code: 'NOT_FOUND',
				details: { resource: 'subject' },
			});
		});

		it('should work with JSON.stringify', () => {
			const error = new C15TError({
				message: 'Server error',
				status: 500,
			});

			const str = JSON.stringify(error);
			const parsed = JSON.parse(str);

			expect(parsed.name).toBe('C15TError');
			expect(parsed.message).toBe('Server error');
			expect(parsed.status).toBe(500);
		});
	});

	describe('isC15TError type guard', () => {
		it('should return true for C15TError instances', () => {
			const error = new C15TError({ message: 'Test', status: 400 });
			expect(isC15TError(error)).toBe(true);
		});

		it('should return false for regular Error', () => {
			const error = new Error('Regular error');
			expect(isC15TError(error)).toBe(false);
		});

		it('should return false for non-error objects', () => {
			expect(isC15TError({ message: 'Not an error', status: 400 })).toBe(false);
			expect(isC15TError(null)).toBe(false);
			expect(isC15TError(undefined)).toBe(false);
			expect(isC15TError('error')).toBe(false);
		});
	});

	describe('integration with catch blocks', () => {
		it('should work in try-catch pattern', () => {
			const throwError = () => {
				throw new C15TError({
					message: 'Subject not found',
					status: 404,
					code: 'NOT_FOUND',
				});
			};

			try {
				throwError();
			} catch (error) {
				if (isC15TError(error)) {
					expect(error.status).toBe(404);
					expect(error.isNotFound()).toBe(true);
				} else {
					throw new Error('Expected C15TError');
				}
			}
		});
	});
});
