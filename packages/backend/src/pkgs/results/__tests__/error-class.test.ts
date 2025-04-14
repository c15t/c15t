import { describe, expect, it } from 'vitest';
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
      expect(error.statusCode).toBe(400);
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
      expect(error.statusCode).toBe(500);
      expect(error.category).toBe(ERROR_CATEGORIES.UNEXPECTED);
      expect(error.meta).toEqual({});
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
      expect(error.statusCode).toBe(404);
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
      expect(error.statusCode).toBe(404);
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
    it('should serialize error to JSON with H3 compatible structure', () => {
      const error = new DoubleTieError('Test error', {
        code: ERROR_CODES.BAD_REQUEST,
        status: 400,
        category: ERROR_CATEGORIES.VALIDATION,
        meta: { field: 'username' },
      });

      const errorJson = error.toJSON();

      expect(errorJson.statusCode).toBe(400);
      expect(errorJson.message).toBe('Test error');
      expect(errorJson.data?.code).toBe(ERROR_CODES.BAD_REQUEST);
      expect(errorJson.data?.category).toBe(ERROR_CATEGORIES.VALIDATION);
      expect(errorJson.data?.meta).toEqual({ field: 'username' });
    });

    it('should include validation error message when present', () => {
      const error = new DoubleTieError('Validation failed', {
        code: ERROR_CODES.BAD_REQUEST,
        status: 422,
        meta: { validationErrors: 'Field X is required' },
      });

      const errorJson = error.toJSON();

      expect(errorJson.message).toBe('Field X is required');
      expect(errorJson.data?.originalMessage).toBe('Validation failed');
    });
  });

  describe('withMeta', () => {
    it('should create a new error with combined metadata', () => {
      const error = new DoubleTieError('Test error', {
        code: ERROR_CODES.BAD_REQUEST,
        meta: { field: 'username' },
      });

      const newError = error.withMeta({ reason: 'validation failed' });

      expect(error.meta).toEqual({ field: 'username' });

      expect(newError.meta).toEqual({
        field: 'username',
        reason: 'validation failed',
      });

      expect(newError.message).toBe(error.message);
      expect(newError.code).toBe(error.code);
      expect(newError.statusCode).toBe(error.statusCode);
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
