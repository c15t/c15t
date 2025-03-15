import {
	ResultAsync,
	err,
	errAsync,
	fromPromise,
	ok,
	okAsync,
} from 'neverthrow';
import { DoubleTieError } from '../core/error-class';
import { ERROR_CODES } from '../core/error-codes';
import type {
	ErrorMessageType,
	ErrorTransformer,
	SDKResult,
	SDKResultAsync,
} from '../types';

/**
 * Creates a successful result containing the provided value.
 *
 * @template TValue - The type of the success value
 * @param value - The value to wrap in a success result
 * @returns A Result containing the value
 *
 * @example
 * ```typescript
 * const result = ok('John Doe');
 * ```
 */
export { ok };

/**
 * Creates a failure result containing a DoubleTieError with the provided message and options.
 *
 * @template TValue - The type of the expected success value (had the operation succeeded)
 * @param message - Human-readable error message
 * @param options - Error options including code, status, and other metadata
 * @returns A Result containing the error
 * 
 * @remarks
 * This is the counterpart to the `ok` function and should be used when an operation
 * fails and you want to create a Result representing the failure.
 * 
 * @see ok for creating successful results
 * @see DoubleTieError for more details on the error options
 *
 * @example
 * ```typescript
 * // Create a failure result for a not found error
 * const result = fail<User>('User not found', {
 *   code: ERROR_CODES.NOT_FOUND,
 *   status: 404,
 *   meta: { userId: '123' }
 * });
 * 
 * // Use with match for safe handling
 * result.match(
 *   (user) => console.log(user), // Will not be called
 *   (error) => console.error(`${error.code}: ${error.message}`) // Will be called
 * );
 * ```
 */
export function fail<TValue>(
	message: string,
	options: ConstructorParameters<typeof DoubleTieError>[1]
): SDKResult<TValue> {
	return err(new DoubleTieError(message, options));
}

/**
 * Creates an asynchronous failure result containing a DoubleTieError with the provided message and options.
 *
 * @template TValue - The type of the expected success value (had the operation succeeded)
 * @param message - Human-readable error message
 * @param options - Error options including code, status, and other metadata
 * @returns A ResultAsync containing the error
 * 
 * @remarks
 * This is the asynchronous counterpart to the `fail` function and should be used when an 
 * operation fails and you want to create a ResultAsync representing the failure.
 * 
 * @see okAsync for creating successful async results
 * @see fail for the synchronous version
 *
 * @example
 * ```typescript
 * // Create an async failure result for an authentication error
 * const result = failAsync<Session>('Authentication failed', {
 *   code: ERROR_CODES.UNAUTHORIZED,
 *   status: 401,
 *   meta: { attempt: 3 }
 * });
 * 
 * // Chain with other async operations
 * const profile = await result
 *   .orElse(err => {
 *     // Handle the error or return another result
 *     console.error(`Auth failed: ${err.message}`);
 *     return okAsync(createGuestSession());
 *   })
 *   .andThen(session => getProfile(session.userId));
 * ```
 */
export function failAsync<TValue>(
	message: string,
	options: ConstructorParameters<typeof DoubleTieError>[1]
): SDKResultAsync<TValue> {
	return errAsync(new DoubleTieError(message, options));
}

/**
 * Safely executes a function that might throw and converts the result into a Result type.
 * If the function throws, the error is transformed into a DoubleTieError.
 *
 * @template TValue - The type of the success value returned by the function
 * @param fn - The function to execute
 * @param errorCode - The error code to use if the function throws (defaults to UNKNOWN_ERROR)
 * @param errorMapper - Optional function to customize how errors are transformed into DoubleTieErrors
 * @returns A Result containing either the function's return value or a DoubleTieError
 * 
 * @remarks
 * This function is useful for wrapping existing code that uses try/catch
 * to make it work with the Result pattern. It allows safe execution of
 * operations that might throw exceptions.
 * 
 * @see tryCatchAsync for the asynchronous version
 * 
 * @example
 * ```typescript
 * // Wrap a function that might throw
 * const parseConfig = (configStr: string) => {
 *   return tryCatch(
 *     () => JSON.parse(configStr),
 *     ERROR_CODES.INVALID_CONFIG,
 *     (err) => new DoubleTieError(`Failed to parse config: ${err.message}`, {
 *       code: ERROR_CODES.INVALID_CONFIG,
 *       status: 400,
 *       cause: err,
 *       meta: { configStr }
 *     })
 *   );
 * };
 * 
 * // Use the wrapped function
 * const configResult = parseConfig(rawConfig);
 * configResult.match(
 *   (config) => initializeApp(config),
 *   (error) => logError('Config error', error)
 * );
 * ```
 */
export function tryCatch<TValue>(
	fn: () => TValue,
	errorCode: ErrorMessageType = ERROR_CODES.UNKNOWN_ERROR,
	errorMapper?: ErrorTransformer
): SDKResult<TValue> {
	try {
		return ok(fn());
	} catch (error) {
		if (errorMapper && error instanceof Error) {
			return err(errorMapper(error));
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		return err(
			new DoubleTieError(errorMessage, {
				code: errorCode,
				cause: error instanceof Error ? error : undefined,
			})
		);
	}
}

/**
 * Safely executes an asynchronous function that might throw and converts the result into a ResultAsync type.
 * If the function throws, the error is transformed into a DoubleTieError.
 *
 * @template TValue - The type of the success value returned by the function
 * @param fn - The asynchronous function to execute
 * @param errorCode - The error code to use if the function throws (defaults to UNKNOWN_ERROR)
 * @param errorMapper - Optional function to customize how errors are transformed into DoubleTieErrors
 * @returns A ResultAsync containing either the function's return value or a DoubleTieError
 * 
 * @remarks
 * This function is useful for wrapping existing asynchronous code that uses try/catch
 * to make it work with the Result pattern. It allows safe execution of
 * operations that might throw exceptions.
 * 
 * @see tryCatch for the synchronous version
 * @see promiseToResult for wrapping an existing Promise
 * 
 * @example
 * ```typescript
 * // Wrap an async function that might throw
 * const fetchUserData = (userId: string) => {
 *   return tryCatchAsync(
 *     async () => {
 *       const response = await fetch(`/api/users/${userId}`);
 *       if (!response.ok) {
 *         throw new Error(`HTTP error ${response.status}`);
 *       }
 *       return response.json();
 *     },
 *     ERROR_CODES.API_ERROR,
 *     (err) => new DoubleTieError(`Failed to fetch user data: ${err.message}`, {
 *       code: ERROR_CODES.API_ERROR,
 *       status: 500,
 *       cause: err,
 *       meta: { userId }
 *     })
 *   );
 * };
 * 
 * // Use the wrapped function
 * const userData = await fetchUserData('123')
 *   .match(
 *     (data) => processUserData(data),
 *     (error) => handleApiError(error)
 *   );
 * ```
 */
export function tryCatchAsync<TValue>(
	fn: () => Promise<TValue>,
	errorCode: ErrorMessageType = ERROR_CODES.UNKNOWN_ERROR,
	errorMapper?: ErrorTransformer
): ResultAsync<TValue, DoubleTieError> {
	// Create and return a ResultAsync that will handle the Promise
	return new ResultAsync<TValue, DoubleTieError>(
		(async () => {
			try {
				const result = await fn();
				return ok(result);
			} catch (error) {
				if (errorMapper && error instanceof Error) {
					return err(errorMapper(error));
				}

				const errorMessage =
					error instanceof Error ? error.message : String(error);
				return err(
					new DoubleTieError(errorMessage, {
						code: errorCode,
						cause: error instanceof Error ? error : undefined,
					})
				);
			}
		})()
	);
}

/**
 * Converts a Promise into a ResultAsync. If the Promise resolves, the result will be a success.
 * If the Promise rejects, the error will be transformed into a DoubleTieError.
 *
 * @template TValue - The type of the success value returned by the Promise
 * @param promise - The Promise to convert
 * @param errorCode - The error code to use if the Promise rejects (defaults to UNKNOWN_ERROR)
 * @returns A ResultAsync containing either the Promise's resolved value or a DoubleTieError
 * 
 * @remarks
 * This function is useful for wrapping existing Promise-based APIs to make them
 * work with the Result pattern. Unlike tryCatchAsync, this function takes an
 * already-created Promise rather than a function that returns a Promise.
 * 
 * @see tryCatchAsync for wrapping async functions
 * 
 * @example
 * ```typescript
 * // Wrap an existing Promise
 * const fetchData = (url: string) => {
 *   const promise = fetch(url)
 *     .then(response => {
 *       if (!response.ok) {
 *         throw new Error(`HTTP error ${response.status}`);
 *       }
 *       return response.json();
 *     });
 *   
 *   return promiseToResult(promise, ERROR_CODES.API_ERROR);
 * };
 * 
 * // Use the wrapped function
 * const result = await fetchData('https://api.example.com/data');
 * result.match(
 *   (data) => console.log('Data:', data),
 *   (error) => console.error(`Error ${error.code}: ${error.message}`)
 * );
 * ```
 */
export function promiseToResult<TValue>(
	promise: Promise<TValue>,
	errorCode: ErrorMessageType = ERROR_CODES.UNKNOWN_ERROR
): ResultAsync<TValue, DoubleTieError> {
	return fromPromise(
		promise,
		(error) =>
			new DoubleTieError(
				error instanceof Error ? error.message : String(error),
				{
					code: errorCode,
					cause: error instanceof Error ? error : undefined,
					meta: { error },
				}
			)
	);
}
