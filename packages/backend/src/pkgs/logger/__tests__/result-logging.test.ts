import { Result, ResultAsync, err, errAsync, ok, okAsync } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { logResult, logResultAsync } from '../result-logging';
import type { LoggableError } from '../types';

describe('result-logging', () => {
	describe('logResult', () => {
		it('should log error from a Result and return the original Result', () => {
			// Create a mock logger
			const logger = {
				error: vi.fn(),
			};

			// Create a sample error
			const testError: LoggableError = {
				message: 'Test error',
				code: 'TEST_ERROR',
				status: 400,
				meta: { test: true },
				category: 'test',
				stack: 'Error stack',
			};

			// Create an error Result
			const errorResult: Result<string, LoggableError> = err(testError);

			// Log the error
			const result = logResult(errorResult, logger);

			// Verify the logger was called with the correct arguments
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith('Error occurred: Test error', {
				code: 'TEST_ERROR',
				status: 400,
				meta: { test: true },
				category: 'test',
				stack: 'Error stack',
			});

			// Verify the original Result is returned unchanged
			expect(result).toStrictEqual(errorResult);

			// Verify the error inside the Result is unchanged
			result.mapErr((error) => {
				expect(error).toEqual(testError);
				return error;
			});
		});

		it('should not log anything for a successful Result', () => {
			const logger = {
				error: vi.fn(),
			};

			const successResult: Result<string, LoggableError> = ok('Success');

			const result = logResult(successResult, logger);

			// Verify logger was not called
			expect(logger.error).not.toHaveBeenCalled();

			// Verify the original Result is returned unchanged
			expect(result).toStrictEqual(successResult);
		});

		it('should use custom message prefix when provided', () => {
			const logger = {
				error: vi.fn(),
			};

			const testError: LoggableError = {
				message: 'Test error',
			};

			const errorResult: Result<string, LoggableError> = err(testError);

			logResult(errorResult, logger, 'Custom prefix:');

			expect(logger.error).toHaveBeenCalledWith(
				'Custom prefix: Test error',
				expect.any(Object)
			);
		});

		it('should handle errors with minimal properties', () => {
			const logger = {
				error: vi.fn(),
			};

			// Create a minimal error with just the required message property
			const minimalError: LoggableError = {
				message: 'Minimal error',
			};

			const errorResult: Result<string, LoggableError> = err(minimalError);

			logResult(errorResult, logger);

			expect(logger.error).toHaveBeenCalledWith(
				'Error occurred: Minimal error',
				{
					code: undefined,
					status: undefined,
					meta: undefined,
					category: undefined,
					stack: undefined,
				}
			);
		});
	});

	describe('logResultAsync', () => {
		it('should log error from a ResultAsync and return the original ResultAsync', async () => {
			const logger = {
				error: vi.fn(),
			};

			const testError: LoggableError = {
				message: 'Async test error',
				code: 'ASYNC_TEST_ERROR',
				status: 500,
			};

			const errorResultAsync: ResultAsync<string, LoggableError> =
				errAsync(testError);

			const resultAsync = logResultAsync(errorResultAsync, logger);

			// Wait for the async operation to complete
			await resultAsync.match(
				() => {},
				() => {}
			);

			// Verify the logger was called with the correct arguments
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Error occurred: Async test error',
				{
					code: 'ASYNC_TEST_ERROR',
					status: 500,
					meta: undefined,
					category: undefined,
					stack: undefined,
				}
			);
		});

		it('should not log anything for a successful ResultAsync', async () => {
			const logger = {
				error: vi.fn(),
			};

			const successResultAsync: ResultAsync<string, LoggableError> =
				okAsync('Async Success');

			const resultAsync = logResultAsync(successResultAsync, logger);

			await resultAsync.match(
				() => {},
				() => {}
			);

			expect(logger.error).not.toHaveBeenCalled();
		});

		it('should use custom message prefix for async errors', async () => {
			const logger = {
				error: vi.fn(),
			};

			const testError: LoggableError = {
				message: 'Async error',
			};

			const errorResultAsync: ResultAsync<string, LoggableError> =
				errAsync(testError);

			const resultAsync = logResultAsync(
				errorResultAsync,
				logger,
				'Async error:'
			);

			await resultAsync.match(
				() => {},
				() => {}
			);

			expect(logger.error).toHaveBeenCalledWith(
				'Async error: Async error',
				expect.any(Object)
			);
		});
	});
});
