import { err, ok } from 'neverthrow';
import type { ErrorCategory, ErrorMessageType, SDKResult } from '../types';

/**
 * Recovers from specific error codes by handling the error and returning a default value.
 * If the error is one of the specified codes, returns the default value.
 * Otherwise, passes the error through.
 *
 * @template TValue - Type of the success value in the result
 * @param result - The result that may contain an error
 * @param errorCodes - Array of error codes to recover from
 * @param defaultValue - Value to return if the error code matches
 * @returns The original result if successful or if error code doesn't match,
 *          or a new successful result with the default value
 *
 * @example
 * ```typescript
 * import { CORE_ERROR_CODES } from '@doubletie/errors';
 *
 * // Recover from not found errors
 * const userResult = await getUserById(userId);
 * const safeUserResult = withFallbackForCodes(
 *   userResult,
 *   [CORE_ERROR_CODES.NOT_FOUND],
 *   { id: userId, name: 'Unknown User', isDefault: true }
 * );
 * ```
 */
export const withFallbackForCodes = <TValue>(
	result: SDKResult<TValue>,
	errorCodes: ErrorMessageType[],
	defaultValue: TValue
): SDKResult<TValue> => {
	return result.orElse((error) => {
		if (error.code && errorCodes.includes(error.code)) {
			return ok(defaultValue);
		}
		return err(error);
	});
};

/**
 * Recovers from errors in a specific category by handling the error and returning a default value.
 * If the error's category matches the specified category, returns the default value.
 * Otherwise, passes the error through.
 *
 * @template TValue - Type of the success value in the result
 * @param result - The result that may contain an error
 * @param category - Error category to recover from
 * @param defaultValue - Value to return if the error category matches
 * @returns The original result if successful or if error category doesn't match,
 *          or a new successful result with the default value
 *
 * @example
 * ```typescript
 * import { ERROR_CATEGORIES } from '@doubletie/errors';
 *
 * // Recover from all network errors
 * const dataResult = await fetchRemoteData();
 * const safeDataResult = withFallbackForCategory(
 *   dataResult,
 *   ERROR_CATEGORIES.NETWORK,
 *   { status: 'offline', data: cachedData, isCached: true }
 * );
 * ```
 */
export const withFallbackForCategory = <TValue>(
	result: SDKResult<TValue>,
	category: ErrorCategory,
	defaultValue: TValue
): SDKResult<TValue> => {
	return result.orElse((error) => {
		if (error.category === category) {
			return ok(defaultValue);
		}
		return err(error);
	});
};
