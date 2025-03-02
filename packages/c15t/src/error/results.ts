import { type Result, ResultAsync, err, ok as neverOk } from 'neverthrow';
import { C15TError } from './error';
import { type ErrorMessage, BASE_ERROR_CODES } from './codes';

/**
 * Type for C15T results that can contain any error
 */
export type C15TResult<T> = Result<T, C15TError>;

/**
 * Type for C15T async results that can contain any error
 */
export type C15TResultAsync<T> = ResultAsync<T, C15TError>;

/**
 * Creates a successful result
 */
export const ok = <T>(value: T): C15TResult<T> => neverOk(value);

/**
 * Creates a standardized failure Result with a C15TError
 *
 * @param message - Error message
 * @param options - Additional error options
 * @returns A Result containing the error
 */
export const fail = <T>(
	message: string,
	options?: {
		code?: ErrorMessage;
		status?: number;
		data?: Record<string, unknown>;
	}
): Result<T, C15TError> => {
	return err(new C15TError(message, options));
};

/**
 * Creates a standardized failure ResultAsync with a C15TError
 *
 * @param message - Error message
 * @param options - Additional error options
 * @returns A ResultAsync containing the error
 */
export const failAsync = <T>(
	message: string,
	options?: {
		code?: ErrorMessage;
		status?: number;
		data?: Record<string, unknown>;
	}
): ResultAsync<T, C15TError> => {
	return ResultAsync.fromSafePromise(
		Promise.reject(new C15TError(message, options))
	);
};

/**
 * Wraps a potentially throwing function in a Result
 *
 * @param fn - Function that might throw
 * @param errorCode - Optional error code to use if fn throws
 * @returns A Result containing either the function result or a C15TError
 */
export const safeResult = <T>(
	fn: () => T,
	errorCode: ErrorMessage = BASE_ERROR_CODES.UNKNOWN_ERROR
): Result<T, C15TError> => {
	try {
		return ok(fn());
	} catch (error) {
		return err(
			new C15TError(error instanceof Error ? error.message : String(error), {
				code: errorCode,
				data: { originalError: error },
			})
		);
	}
};

/**
 * Wraps a Promise in a ResultAsync
 *
 * @param promise - Promise that might reject
 * @param errorCode - Optional error code to use if promise rejects
 * @returns A ResultAsync containing either the promise result or a C15TError
 */
export const safeResultAsync = <T>(
	promise: Promise<T>,
	errorCode: ErrorMessage = BASE_ERROR_CODES.UNKNOWN_ERROR
): ResultAsync<T, C15TError> => {
	return ResultAsync.fromPromise(
		promise,
		(error): C15TError =>
			new C15TError(error instanceof Error ? error.message : String(error), {
				code: errorCode,
				data: { originalError: error },
			})
	);
};

/**
 * Helper to convert C15TError instances back to traditional thrown errors
 * Useful for backward compatibility with existing code that expects errors to be thrown
 */
export const toThrowable = <T>(result: C15TResult<T>): T => {
	return result.match(
		(value: T) => value,
		(error: C15TError) => {
			throw error;
		}
	);
};

/**
 * Helper to convert async Result to a throwing Promise
 * Useful for backward compatibility with existing code that expects promises with thrown errors
 */
export const toPromise = <T>(result: C15TResultAsync<T>): Promise<T> => {
	return new Promise<T>((resolve, reject) => {
		result.match(
			(value: T) => resolve(value),
			(error: C15TError) => reject(error)
		);
	});
};
