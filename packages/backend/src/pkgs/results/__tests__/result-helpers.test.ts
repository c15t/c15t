import { ResultAsync } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { DoubleTieError } from '../core/error-class';
import { ERROR_CODES } from '../core/error-codes';
import {
  fail,
  failAsync,
  ok,
  tryCatch,
  tryCatchAsync,
} from '../results/result-helpers';

describe('result-helpers', () => {
  describe('ok', () => {
    it('should create a successful result containing the provided value', () => {
      const value = { name: 'Test User' };
      const result = ok(value);

      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);

      // Extract the value and verify it's the same object
      expect(result._unsafeUnwrap()).toBe(value);
    });
  });

  describe('fail', () => {
    it('should create a failure result with a DoubleTieError', () => {
      const errorMessage = 'Failed to find user';
      const errorOptions = {
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        meta: { userId: '123' },
      };

      const result = fail(errorMessage, errorOptions);

      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);

      // Extract the error and verify properties
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(DoubleTieError);
      expect(error.message).toBe(errorMessage);
      expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.meta).toEqual({ userId: '123' });
    });
  });

  describe('failAsync', () => {
    it('should create an async failure result with a DoubleTieError', async () => {
      const errorMessage = 'Failed to connect to database';
      const errorOptions = {
        code: ERROR_CODES.DATABASE_CONNECTION_ERROR,
        status: 500,
        meta: { connectionId: 'db1' },
      };

      const result = failAsync(errorMessage, errorOptions);

      expect(result).toBeInstanceOf(ResultAsync);

      // Await and verify the result
      const awaitedResult = await result;
      expect(awaitedResult.isOk()).toBe(false);
      expect(awaitedResult.isErr()).toBe(true);

      // Extract the error and verify properties
      const error = awaitedResult._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(DoubleTieError);
      expect(error.message).toBe(errorMessage);
      expect(error.code).toBe(ERROR_CODES.DATABASE_CONNECTION_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.meta).toEqual({ connectionId: 'db1' });
    });
  });

  describe('tryCatch', () => {
    it('should return a successful result when the function succeeds', () => {
      const fn = () => 'success';
      const result = tryCatch(fn);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe('success');
    });

    it('should return a failure result when the function throws', () => {
      const fn = () => {
        throw new Error('Something went wrong');
      };
      const result = tryCatch(fn);

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(DoubleTieError);
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe(ERROR_CODES.UNKNOWN_ERROR); // Default error code
    });

    it('should use the provided error code when the function throws', () => {
      const fn = () => {
        throw new Error('Invalid data');
      };
      const result = tryCatch(fn, ERROR_CODES.BAD_REQUEST);

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(DoubleTieError);
      expect(error.message).toBe('Invalid data');
      expect(error.code).toBe(ERROR_CODES.BAD_REQUEST);
    });

    it('should use the provided error mapper when the function throws', () => {
      const originalError = new Error('Original error');
      const fn = () => {
        throw originalError;
      };

      const customError = new DoubleTieError('Mapped error', {
        code: ERROR_CODES.INVALID_REQUEST,
        status: 400,
      });

      const errorMapper = vi.fn().mockReturnValue(customError);

      const result = tryCatch(fn, ERROR_CODES.UNKNOWN_ERROR, errorMapper);

      expect(result.isErr()).toBe(true);
      expect(errorMapper).toHaveBeenCalledWith(originalError);
      expect(result._unsafeUnwrapErr()).toBe(customError);
    });
  });

  describe('tryCatchAsync', () => {
    it('should return a successful result when the async function succeeds', async () => {
      const fn = async () => 'async success';
      const result = tryCatchAsync(fn);

      expect(result).toBeInstanceOf(ResultAsync);

      const finalResult = await result;
      expect(finalResult.isOk()).toBe(true);
      expect(finalResult._unsafeUnwrap()).toBe('async success');
    });

    it('should return a failure result when the async function throws', async () => {
      const fn = async () => {
        throw new Error('Async error');
      };

      const result = tryCatchAsync(fn);
      expect(result).toBeInstanceOf(ResultAsync);

      const finalResult = await result;

      expect(finalResult.isErr()).toBe(true);
      const error = finalResult._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(DoubleTieError);
      expect(error.message).toBe('Async error');
      expect(error.code).toBe(ERROR_CODES.UNKNOWN_ERROR); // Default error code
    });

    it('should use the provided error code when the async function throws', async () => {
      const fn = async () => {
        throw new Error('Network failure');
      };

      const resultPromise = tryCatchAsync(fn, ERROR_CODES.NETWORK_ERROR);
      const result = await resultPromise;
      const finalResult = await result;

      expect(finalResult.isErr()).toBe(true);
      const error = finalResult._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(DoubleTieError);
      expect(error.message).toBe('Network failure');
      expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR);
    });

    it('should use the provided error mapper when the async function throws', async () => {
      const originalError = new Error('Original async error');
      const fn = async () => {
        throw originalError;
      };

      const customError = new DoubleTieError('Mapped async error', {
        code: ERROR_CODES.INVALID_REQUEST,
        status: 400,
      });

      const errorMapper = vi.fn().mockReturnValue(customError);

      const resultPromise = tryCatchAsync(
        fn,
        ERROR_CODES.UNKNOWN_ERROR,
        errorMapper
      );
      const result = await resultPromise;
      const finalResult = await result;

      expect(finalResult.isErr()).toBe(true);
      expect(errorMapper).toHaveBeenCalledWith(originalError);
      expect(finalResult._unsafeUnwrapErr()).toBe(customError);
    });
  });
});
