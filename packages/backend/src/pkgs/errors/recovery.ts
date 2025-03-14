import { type Result, err, ok } from 'neverthrow';
import type { ErrorCategory, ErrorMessage } from './codes';
import type { C15TError } from './error';

/**
 * Recovers from specific error codes by transforming to a default value
 *
 * @param result - The result that may contain an error
 * @param errorCodes - Array of error codes to recover from
 * @param defaultValue - Value to use if error matches specified codes
 * @returns A new Result with the error recovered if it matches specified codes
 */
export const recoverFromCodes = <T>(
	result: Result<T, C15TError>,
	errorCodes: ErrorMessage[],
	defaultValue: T
): Result<T, C15TError> => {
	return result.orElse((error) => {
		if (error.code && errorCodes.includes(error.code)) {
			return ok(defaultValue);
		}
		return err(error);
	});
};

/**
 * Recovers from errors of a specific category
 *
 * @param result - The result that may contain an error
 * @param category - Error category to recover from
 * @param defaultValue - Value to use if error matches specified category
 * @returns A new Result with the error recovered if it matches the category
 */
export const recoverFromCategory = <T>(
	result: Result<T, C15TError>,
	category: ErrorCategory,
	defaultValue: T
): Result<T, C15TError> => {
	return result.orElse((error) => {
		if (error.category === category) {
			return ok(defaultValue);
		}
		return err(error);
	});
};
