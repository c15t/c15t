import { err, ok } from 'neverthrow';
import { withSpan } from '../core/tracing';
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
 * @remarks
 * This function implements the "fallback value" pattern for error recovery.
 * It's particularly useful for handling expected error conditions like "not found"
 * where you want to provide a default value instead of propagating the error.
 *
 * The function does not modify the original result if it is successful or
 * if the error doesn't match any of the specified codes.
 *
 * @see withFallbackForCategory for recovery based on error category
 *
 * @example
 * ```typescript
 * import { withFallbackForCodes, ERROR_CODES } from '@doubletie/results';
 *
 * // Recover from not found errors with a default user
 * const getUserById = async (userId: string) => {
 *   const result = await fetchUserFromDatabase(userId);
 *
 *   return withFallbackForCodes(
 *     result,
 *     [ERROR_CODES.NOT_FOUND, ERROR_CODES.RESOURCE_DELETED],
 *     {
 *       id: userId,
 *       name: 'Unknown User',
 *       isDefault: true,
 *       email: 'unknown@example.com'
 *     }
 *   );
 * };
 *
 * // Usage with pattern matching
 * const userResult = await getUserById('123');
 * userResult.match(
 *   user => {
 *     console.log(`User: ${user.name}`);
 *     if (user.isDefault) {
 *       console.log('Using default user');
 *     }
 *   },
 *   error => console.error(`Unexpected error: ${error.message}`)
 * );
 * ```
 */
export const withFallbackForCodes = <TValue>(
	result: SDKResult<TValue>,
	errorCodes: ErrorMessageType[],
	defaultValue: TValue
): SDKResult<TValue> => {
	withSpan('recovery_with_fallback_codes', async (span) => {
		span.setAttributes({
			'recovery.type': 'error_codes',
			'recovery.codes': errorCodes.join(','),
			'result.is_error': result.isErr(),
		});
	});

	return result.orElse((error) => {
		if (error.code && errorCodes.includes(error.code)) {
			withSpan('recovery_with_fallback_codes', async (span) => {
				span.setAttributes({
					'recovery.matched': true,
					'recovery.error_code': error.code,
				});
			});
			return ok(defaultValue);
		}

		withSpan('recovery_with_fallback_codes', async (span) => {
			span.setAttributes({
				'recovery.matched': false,
				'recovery.error_code': error.code,
			});
		});
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
 * @remarks
 * This function is similar to `withFallbackForCodes` but matches errors based on
 * their category rather than specific error codes. This is useful when you want to
 * handle all errors in a particular domain (e.g., network, database, validation)
 * in a consistent way.
 *
 * The function does not modify the original result if it is successful or
 * if the error's category doesn't match the specified category.
 *
 * @see withFallbackForCodes for recovery based on specific error codes
 * @see ERROR_CATEGORIES for predefined categories
 *
 * @example
 * ```typescript
 * import { withFallbackForCategory, ERROR_CATEGORIES } from '@doubletie/results';
 *
 * // Recover from all network-related errors with a cached value
 * const fetchData = async (url: string, cachedData: ApiResponse) => {
 *   const result = await makeApiRequest(url);
 *
 *   return withFallbackForCategory(
 *     result,
 *     ERROR_CATEGORIES.NETWORK,
 *     {
 *       ...cachedData,
 *       fromCache: true,
 *       lastUpdated: new Date(cachedData.timestamp)
 *     }
 *   );
 * };
 *
 * // Usage with pattern matching
 * const dataResult = await fetchData('/api/stats', cachedStats);
 * dataResult.match(
 *   data => {
 *     if (data.fromCache) {
 *       console.log(`Using cached data from ${data.lastUpdated}`);
 *     }
 *     renderDashboard(data);
 *   },
 *   error => console.error(`Error: ${error.message}`)
 * );
 * ```
 */
export const withFallbackForCategory = <TValue>(
	result: SDKResult<TValue>,
	category: ErrorCategory,
	defaultValue: TValue
): SDKResult<TValue> => {
	withSpan('recovery_with_fallback_category', async (span) => {
		span.setAttributes({
			'recovery.type': 'error_category',
			'recovery.category': category,
			'result.is_error': result.isErr(),
		});
	});

	return result.orElse((error) => {
		if (error.category === category) {
			withSpan('recovery_with_fallback_category', async (span) => {
				span.setAttributes({
					'recovery.matched': true,
					'recovery.error_category': error.category,
				});
			});
			return ok(defaultValue);
		}
		withSpan('recovery_with_fallback_category', async (span) => {
			span.setAttributes({
				'recovery.matched': false,
				'recovery.error_category': error.category,
			});
		});
		return err(error);
	});
};
