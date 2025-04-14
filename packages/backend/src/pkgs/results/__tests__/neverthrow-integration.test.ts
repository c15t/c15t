// packages/backend/src/pkgs/errors/__tests__/neverthrow-integration.test.ts
import { describe, expect, it } from 'vitest';
import {
  DoubleTieError,
  ERROR_CODES,
  fail,
  failAsync,
  ok,
  tryCatchAsync,
} from '../index';

describe('DoubleTie - neverthrow integration', () => {
  describe('ok function', () => {
    it('creates a successful Result with the provided value', () => {
      const value = { id: '123', name: 'Test User' };
      const result = ok(value);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(value);
    });
  });

  describe('fail function', () => {
    it('creates a Result.err with a DoubleTieError', () => {
      const result = fail('Resource not found', {
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(DoubleTieError);
      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
    });

    it('preserves the error details when mapping errors', () => {
      const result = fail('Invalid data', {
        code: ERROR_CODES.BAD_REQUEST,
        status: 400,
        meta: { field: 'email' },
      });

      const mapped = result.mapErr((err) => {
        expect(err).toBeInstanceOf(DoubleTieError);
        expect(err.meta.field).toBe('email');
        return err.withMeta({ additionalInfo: 'mapped' });
      });

      expect(mapped.isErr()).toBe(true);
      const error = mapped._unsafeUnwrapErr();
      expect(error.meta).toEqual({
        field: 'email',
        additionalInfo: 'mapped',
      });
    });
  });

  describe('ResultAsync integration', () => {
    it('properly handles async operations with DoubleTieErrors', async () => {
      const asyncResult = failAsync('Network error', {
        code: ERROR_CODES.NETWORK_ERROR,
        status: 503,
      });

      const result = await asyncResult;

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(DoubleTieError);
      expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR);
    });

    it('catches errors in async operations with tryCatchAsync', async () => {
      const asyncFn = async () => {
        throw new Error('Something went wrong');
      };

      const resultAsync = await tryCatchAsync(
        asyncFn,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );

      expect(resultAsync.isErr()).toBe(true);
      const error = resultAsync._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(DoubleTieError);
      expect(error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(error.cause).toBeInstanceOf(Error);
    });
  });
});
