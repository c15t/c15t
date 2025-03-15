import type { Result, ResultAsync } from 'neverthrow';
import { LoggableError } from './types';

/**
 * Logs any errors in a Result without changing the Result.
 *
 * @remarks
 * This utility function allows logging errors from a Result type without
 * affecting the Result's flow. It uses the mapErr function to extract
 * and log the error if present, then returns the original Result.
 *
 * @typeParam ValueType - The type of the successful value in the Result
 * @typeParam ErrorType - The type of the error in the Result, must extend LoggableError
 *
 * @param result - The Result that may contain an error
 * @param logger - Logger instance with an error method
 * @param message - Optional message prefix for the error
 * @returns The original Result unchanged
 *
 * @example
 * ```ts
 * import { logResult } from '@doubletie/logger';
 * import { createLogger } from '@doubletie/logger';
 * import { ok, err } from 'neverthrow';
 *
 * const logger = createLogger();
 * const result = err({ message: 'Failed operation', code: 'OP_FAILED' });
 *
 * // Log the error but continue processing the Result
 * const processedResult = logResult(result, logger);
 * ```
 *
 * @public
 */
export const logResult = <ValueType, ErrorType extends LoggableError>(
	result: Result<ValueType, ErrorType>,
	logger: { error: (message: string, ...args: unknown[]) => void },
	message = 'Error occurred:'
): Result<ValueType, ErrorType> => {
	return result.mapErr((error) => {
		logger.error(`${message} ${error.message}`, {
			code: error.code,
			status: error.status,
			meta: error.meta,
			category: error.category,
			stack: error.stack,
		});
		return error;
	});
};

/**
 * Logs any errors in a ResultAsync without changing the ResultAsync.
 *
 * @remarks
 * This utility function allows logging errors from a ResultAsync type without
 * affecting the ResultAsync's flow. It uses the mapErr function to extract
 * and log the error if present, then returns the original ResultAsync.
 *
 * @typeParam ValueType - The type of the successful value in the ResultAsync
 * @typeParam ErrorType - The type of the error in the ResultAsync, must extend LoggableError
 *
 * @param resultAsync - The ResultAsync that may contain an error
 * @param logger - Logger instance with an error method
 * @param message - Optional message prefix for the error
 * @returns The original ResultAsync unchanged
 *
 * @example
 * ```ts
 * import { logResultAsync } from '@doubletie/logger';
 * import { createLogger } from '@doubletie/logger';
 * import { okAsync, errAsync } from 'neverthrow';
 *
 * const logger = createLogger();
 * const resultAsync = errAsync({ message: 'Failed async operation', code: 'ASYNC_FAILED' });
 *
 * // Log the error but continue processing the ResultAsync
 * const processedResultAsync = logResultAsync(resultAsync, logger);
 * ```
 *
 * @public
 */
export const logResultAsync = <ValueType, ErrorType extends LoggableError>(
	resultAsync: ResultAsync<ValueType, ErrorType>,
	logger: { error: (message: string, ...args: unknown[]) => void },
	message = 'Error occurred:'
): ResultAsync<ValueType, ErrorType> => {
	return resultAsync.mapErr((error) => {
		logger.error(`${message} ${error.message}`, {
			code: error.code,
			status: error.status,
			meta: error.meta,
			category: error.category,
			stack: error.stack,
		});
		return error;
	});
};
