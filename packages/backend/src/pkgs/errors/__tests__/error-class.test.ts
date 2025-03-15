import { describe, expect, it, vi } from 'vitest';
import { DoubleTieError } from '../core/error-class';
import { ERROR_CATEGORIES, ERROR_CODES } from '../core/error-codes';

describe('DoubleTieError', () => {
	describe('constructor', () => {
		it('should create an error with the provided message and options', () => {
			const message = 'Test error message';
			const options = {
				code: ERROR_CODES.BAD_REQUEST,
				status: 400,
				category: ERROR_CATEGORIES.VALIDATION,
				meta: { foo: 'bar' },
			};

			const error = new DoubleTieError(message, options);

			expect(error.message).toBe(message);
			expect(error.code).toBe(ERROR_CODES.BAD_REQUEST);
			expect(error.status).toBe(400);
			expect(error.category).toBe(ERROR_CATEGORIES.VALIDATION);
			expect(error.meta).toEqual({ foo: 'bar' });
			expect(error.name).toBe('DoubleTieError');
		});

		it('should use default values when not provided', () => {
			const message = 'Test error message';
			const options = {
				code: ERROR_CODES.BAD_REQUEST,
			};

			const error = new DoubleTieError(message, options);

			expect(error.message).toBe(message);
			expect(error.code).toBe(ERROR_CODES.BAD_REQUEST);
			expect(error.status).toBe(500); // Default status
			expect(error.category).toBe(ERROR_CATEGORIES.UNEXPECTED); // Default category
			expect(error.meta).toEqual({}); // Default meta
		});

		it('should capture cause when provided', () => {
			const cause = new Error('Original error');
			const error = new DoubleTieError('Wrapped error', {
				code: ERROR_CODES.INTERNAL_SERVER_ERROR,
				cause,
			});

			expect(error.cause).toBe(cause);
		});
	});

	describe('fromResponse', () => {
		it('should create an error from a Response object', () => {
			const response = new Response('Not found', { status: 404 });
			const error = DoubleTieError.fromResponse(response);

			expect(error).toBeInstanceOf(DoubleTieError);
			expect(error.status).toBe(404);
			expect(error.message).toContain('HTTP error 404');
		});

		it('should extract error details from response data', async () => {
			const responseData = {
				message: 'Resource not found',
				code: ERROR_CODES.NOT_FOUND,
				data: { resourceId: '123' },
			};

			const response = new Response(JSON.stringify(responseData), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});

			const error = DoubleTieError.fromResponse(response, responseData);

			expect(error.message).toBe('Resource not found');
			expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
			expect(error.status).toBe(404);
			expect(error.meta).toEqual({ resourceId: '123' });
		});
	});

	describe('isDoubleTieError', () => {
		it('should return true for DoubleTieError instances', () => {
			const error = new DoubleTieError('Test error', {
				code: ERROR_CODES.BAD_REQUEST,
			});
			expect(DoubleTieError.isDoubleTieError(error)).toBe(true);
		});

		it('should return false for non-DoubleTieError values', () => {
			expect(DoubleTieError.isDoubleTieError(new Error('Regular error'))).toBe(
				false
			);
			expect(DoubleTieError.isDoubleTieError('string')).toBe(false);
			expect(DoubleTieError.isDoubleTieError(null)).toBe(false);
			expect(DoubleTieError.isDoubleTieError(undefined)).toBe(false);
			expect(DoubleTieError.isDoubleTieError(123)).toBe(false);
			expect(DoubleTieError.isDoubleTieError({})).toBe(false);
		});
	});

	describe('toJSON', () => {
		it('should serialize error to JSON', () => {
			const error = new DoubleTieError('Test error', {
				code: ERROR_CODES.BAD_REQUEST,
				status: 400,
				category: ERROR_CATEGORIES.VALIDATION,
				meta: { field: 'username' },
			});

			const errorJson = error.toJSON();

			expect(errorJson).toEqual(
				expect.objectContaining({
					name: 'DoubleTieError',
					message: 'Test error',
					code: ERROR_CODES.BAD_REQUEST,
					status: 400,
					category: ERROR_CATEGORIES.VALIDATION,
					meta: { field: 'username' },
				})
			);
			expect(errorJson.stack).toBeDefined();
		});

		it('should serialize cause if it exists', () => {
			const cause = new Error('Original error');
			const error = new DoubleTieError('Wrapped error', {
				code: ERROR_CODES.INTERNAL_SERVER_ERROR,
				cause,
			});

			const errorJson = error.toJSON();

			expect(errorJson.cause).toEqual(
				expect.objectContaining({
					name: 'Error',
					message: 'Original error',
				})
			);
			expect((errorJson.cause as Error).stack).toBeDefined();
		});
	});

	describe('withMeta', () => {
		it('should create a new error with combined metadata', () => {
			const error = new DoubleTieError('Test error', {
				code: ERROR_CODES.BAD_REQUEST,
				meta: { field: 'username' },
			});

			const newError = error.withMeta({ reason: 'validation failed' });

			// Original error should be unchanged
			expect(error.meta).toEqual({ field: 'username' });

			// New error should have combined metadata
			expect(newError.meta).toEqual({
				field: 'username',
				reason: 'validation failed',
			});

			// Other properties should be the same
			expect(newError.message).toBe(error.message);
			expect(newError.code).toBe(error.code);
			expect(newError.status).toBe(error.status);
			expect(newError.category).toBe(error.category);
		});
	});

	describe('createSubclass', () => {
		it('should create a subclass of DoubleTieError with the specified name', () => {
			const CustomError = DoubleTieError.createSubclass('CustomError');
			const error = new CustomError('Custom error', {
				code: ERROR_CODES.BAD_REQUEST,
			});

			expect(error).toBeInstanceOf(DoubleTieError);
			expect(error).toBeInstanceOf(CustomError);
			expect(error.name).toBe('CustomError');
			expect(CustomError.name).toBe('CustomError');
		});

		it('should allow the subclass to be used with instanceof', () => {
			const PaymentError = DoubleTieError.createSubclass('PaymentError');
			const error = new PaymentError('Payment failed', {
				code: 'PAYMENT_FAILED',
			});

			expect(error instanceof PaymentError).toBe(true);
			expect(error instanceof DoubleTieError).toBe(true);
			expect(error instanceof Error).toBe(true);
		});
	});
});
