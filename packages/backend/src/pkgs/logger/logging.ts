import type { Result, ResultAsync } from 'neverthrow';
import type { C15TError } from '~/pkgs/errors';

/**
 * Logs any errors in a Result without changing the Result
 *
 * @param result - The Result that may contain an error
 * @param logger - Logger instance
 * @param message - Optional message prefix
 * @returns The original Result unchanged
 */
export const logError = <T>(
	result: Result<T, C15TError>,
	logger: { error: (message: string, ...args: unknown[]) => void },
	message = 'Error occurred:'
): Result<T, C15TError> => {
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
 * Logs any errors in a ResultAsync without changing the ResultAsync
 *
 * @param resultAsync - The ResultAsync that may contain an error
 * @param logger - Logger instance
 * @param message - Optional message prefix
 * @returns The original ResultAsync unchanged
 */
export const logErrorAsync = <T>(
	resultAsync: ResultAsync<T, C15TError>,
	logger: { error: (message: string, ...args: unknown[]) => void },
	message = 'Error occurred:'
): ResultAsync<T, C15TError> => {
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
