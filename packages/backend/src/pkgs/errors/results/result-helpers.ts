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
 * @example
 * ```typescript
 * const result = fail('User not found', {
 *   code: ERROR_CODES.NOT_FOUND,
 *   status: 404
 * });
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
 * @example
 * ```typescript
 * const result = failAsync('Failed to connect to database', {
 *   code: ERROR_CODES.DATABASE_CONNECTION_ERROR,
 *   status: 500
 * });
 * ```
 */
export function failAsync<TValue>(
	message: string,
	options: ConstructorParameters<typeof DoubleTieError>[1]
): SDKResultAsync<TValue> {
	return errAsync(new DoubleTieError(message, options));
}

/**
 * Wraps a function that may throw an error in a try/catch block and returns a Result.
 * If the function throws, the error is converted to a DoubleTieError.
 *
 * @template TValue - The type of the success value
 * @param fn - Function that may throw an error
 * @param errorCode - Error code to use if the function throws (defaults to UNKNOWN_ERROR)
 * @param errorMapper - Optional function to map an Error to a DoubleTieError
 * @returns A Result containing either the function's return value or a DoubleTieError
 *
 * @example
 * ```typescript
 * const result = tryCatch(
 *   () => JSON.parse(jsonString),
 *   ERROR_CODES.INVALID_REQUEST
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
 * Wraps an async function that may throw an error in a try/catch block and returns a ResultAsync.
 * If the function throws, the error is converted to a DoubleTieError.
 *
 * @template TValue - The type of the success value
 * @param fn - Async function that may throw an error
 * @param errorCode - Error code to use if the function throws (defaults to UNKNOWN_ERROR)
 * @param errorMapper - Optional function to map an Error to a DoubleTieError
 * @returns A ResultAsync containing either the function's return value or a DoubleTieError
 *
 * @example
 * ```typescript
 * const result = await tryCatchAsync(
 *   () => fetch('https://api.example.com/users'),
 *   ERROR_CODES.NETWORK_ERROR
 * );
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
 * Converts a Promise to a ResultAsync with DoubleTieError handling.
 * This is useful for wrapping third-party promises in the Result pattern.
 *
 * @template TValue - The type of the success value
 * @param promise - The promise to convert to a ResultAsync
 * @param errorCode - Error code to use if the promise rejects (defaults to UNKNOWN_ERROR)
 * @returns A ResultAsync containing either the promise's value or a DoubleTieError
 *
 * @example
 * ```typescript
 * const result = await promiseToResult(
 *   fetch('https://api.example.com/users')
 *     .then(res => res.json()),
 *   ERROR_CODES.NETWORK_ERROR
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
