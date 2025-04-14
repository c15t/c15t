import { err, ok } from 'neverthrow';
import { describe, expect, it } from 'vitest';
import { DoubleTieError } from '../core/error-class';
import { ERROR_CATEGORIES, ERROR_CODES } from '../core/error-codes';
import {
  withFallbackForCategory,
  withFallbackForCodes,
} from '../results/recovery-utils';

describe('recovery-utils', () => {
  describe('withFallbackForCodes', () => {
    it('should return the original result if it is a success', () => {
      const successValue = { id: '123', name: 'John' };
      const successResult = ok(successValue);
      const defaultValue = { id: '0', name: 'Default User' };

      const result = withFallbackForCodes(
        successResult,
        [ERROR_CODES.NOT_FOUND],
        defaultValue
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(successValue);
    });

    it('should return a success result with the default value if the error code matches', () => {
      const error = new DoubleTieError('User not found', {
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
      });
      const failureResult = err(error);
      const defaultValue = { id: '0', name: 'Default User' };

      const result = withFallbackForCodes(
        failureResult,
        [ERROR_CODES.NOT_FOUND],
        defaultValue
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(defaultValue);
    });

    it('should return the original error result if the error code does not match', () => {
      const error = new DoubleTieError('Server error', {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
      });
      const failureResult = err(error);
      const defaultValue = { id: '0', name: 'Default User' };

      const result = withFallbackForCodes(
        failureResult,
        [ERROR_CODES.NOT_FOUND],
        defaultValue
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(error);
    });

    it('should handle multiple error codes to recover from', () => {
      const error = new DoubleTieError('Bad request', {
        code: ERROR_CODES.BAD_REQUEST,
        status: 400,
      });
      const failureResult = err(error);
      const defaultValue = { success: false };

      const result = withFallbackForCodes(
        failureResult,
        [
          ERROR_CODES.NOT_FOUND,
          ERROR_CODES.BAD_REQUEST,
          ERROR_CODES.UNAUTHORIZED,
        ],
        defaultValue
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(defaultValue);
    });
  });

  describe('withFallbackForCategory', () => {
    it('should return the original result if it is a success', () => {
      const successValue = { data: 'some data' };
      const successResult = ok(successValue);
      const defaultValue = { data: 'default data' };

      const result = withFallbackForCategory(
        successResult,
        ERROR_CATEGORIES.NETWORK,
        defaultValue
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(successValue);
    });

    it('should return a success result with the default value if the error category matches', () => {
      const error = new DoubleTieError('Network error', {
        code: ERROR_CODES.NETWORK_ERROR,
        status: 503,
        category: ERROR_CATEGORIES.NETWORK,
      });
      const failureResult = err(error);
      const defaultValue = { data: 'cached data', fromCache: true };

      const result = withFallbackForCategory(
        failureResult,
        ERROR_CATEGORIES.NETWORK,
        defaultValue
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(defaultValue);
    });

    it('should return the original error result if the error category does not match', () => {
      const error = new DoubleTieError('Authentication failed', {
        code: ERROR_CODES.UNAUTHORIZED,
        status: 401,
        category: ERROR_CATEGORIES.AUTHORIZATION,
      });
      const failureResult = err(error);
      const defaultValue = { data: 'default data' };

      const result = withFallbackForCategory(
        failureResult,
        ERROR_CATEGORIES.NETWORK,
        defaultValue
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(error);
    });
  });
});
