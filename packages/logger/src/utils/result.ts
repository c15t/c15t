import type { Result, ResultAsync } from 'neverthrow';
import { logger } from '../core/logger';
import type { LoggableError } from '../core/types';

/**
 * Logs any errors in a Result without changing the Result.
 *
 * @param result - The Result to check for errors
 * @param customLogger - An object with an error method for logging (defaults to the standard logger)
 * @param messagePrefix - Optional prefix for the error message
 * @returns The original Result unchanged
 *
 * @example
 * ```ts
 * // Automatically log errors but continue the Result flow
 * const result = logResult(
 *   validateUser(data),
 *   logger,
 *   'User validation error'
 * );
 *
 * // Continue processing with the result
 * if (result.isOk()) {
 *   // Use the value...
 * }
 * ```
 *
 * @public
 */
export const logResult = <ValueType, ErrorType extends LoggableError>(
	result: Result<ValueType, ErrorType>,
	customLogger: {
		error: (message: string, ...args: unknown[]) => void;
	} = logger,
	messagePrefix = 'Error:'
): Result<ValueType, ErrorType> => {
	if (result.isErr()) {
		const error = result.error;
		customLogger.error(`${messagePrefix} ${error.message}`, error);
	}

	return result;
};

/**
 * Logs any errors from a ResultAsync without changing the ResultAsync.
 *
 * @param resultAsync - The ResultAsync to check for errors
 * @param customLogger - An object with an error method for logging (defaults to the standard logger)
 * @param messagePrefix - Optional prefix for the error message
 * @returns The original ResultAsync unchanged
 *
 * @example
 * ```ts
 * // Log async errors but continue the flow
 * const result = await logResultAsync(
 *   fetchUserData(userId),
 *   logger,
 *   'Failed to fetch user data'
 * );
 *
 * // Continue with the result
 * if (result.isOk()) {
 *   // Use the data...
 * }
 * ```
 *
 * @public
 */
export const logResultAsync = <ValueType, ErrorType extends LoggableError>(
	resultAsync: ResultAsync<ValueType, ErrorType>,
	customLogger: {
		error: (message: string, ...args: unknown[]) => void;
	} = logger,
	messagePrefix = 'Error:'
): ResultAsync<ValueType, ErrorType> => {
	// Chain a tap for error, but don't change the result value
	return resultAsync.mapErr((error) => {
		customLogger.error(`${messagePrefix} ${error.message}`, error);
		return error;
	});
};
