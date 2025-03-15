import type { Result, ResultAsync } from 'neverthrow';
import { BaseError } from './types';

/**
 * Logs any errors in a Result without changing the Result.
 *
 * @remarks
 * This utility function allows logging errors from a Result type without
 * affecting the Result's flow. It uses the mapErr function to extract
 * and log the error if present, then returns the original Result.
 *
 * @typeParam ValueType - The type of the successful value in the Result
 * @typeParam ErrorType - The type of the error in the Result, must extend BaseError
 *
 * @param result - The Result that may contain an error
 * @param logger - Logger instance with an error method
 * @param message - Optional message prefix for the error
 * @returns The original Result unchanged
 *
 * @example
 * ```ts
 * import { logError } from '@doubletie/logger';
 * import { createLogger } from '@doubletie/logger';
 * import { ok, err } from 'neverthrow';
 *
 * const logger = createLogger();
 * const result = err({ message: 'Failed operation', code: 'OP_FAILED' });
 *
 * // Log the error but continue processing the Result
 * const processedResult = logError(result, logger);
 * ```
 *
 * @public
 */
export const logError = <ValueType, ErrorType extends BaseError>(
	result: Result<ValueType, ErrorType>,
	logger: { error: (message: string, ...args: unknown[]) => void },
	message = 'Error occurred:'
): Result<ValueType, ErrorType> => {
	return result.mapErr((error) => {
		logger.error(`${message} ${error.message}`, {
			code: error.code,
			status: error.status,
			data: error.data,
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
 * @typeParam ErrorType - The type of the error in the ResultAsync, must extend BaseError
 *
 * @param resultAsync - The ResultAsync that may contain an error
 * @param logger - Logger instance with an error method
 * @param message - Optional message prefix for the error
 * @returns The original ResultAsync unchanged
 *
 * @example
 * ```ts
 * import { logErrorAsync } from '@doubletie/logger';
 * import { createLogger } from '@doubletie/logger';
 * import { okAsync, errAsync } from 'neverthrow';
 *
 * const logger = createLogger();
 * const resultAsync = errAsync({ message: 'Failed async operation', code: 'ASYNC_FAILED' });
 *
 * // Log the error but continue processing the ResultAsync
 * const processedResultAsync = logErrorAsync(resultAsync, logger);
 * ```
 *
 * @public
 */
export const logErrorAsync = <ValueType, ErrorType extends BaseError>(
	resultAsync: ResultAsync<ValueType, ErrorType>,
	logger: { error: (message: string, ...args: unknown[]) => void },
	message = 'Error occurred:'
): ResultAsync<ValueType, ErrorType> => {
	return resultAsync.mapErr((error) => {
		logger.error(`${message} ${error.message}`, {
			code: error.code,
			status: error.status,
			data: error.data,
			category: error.category,
			stack: error.stack,
		});
		return error;
	});
};
