import {
	Result,
	ResultAsync,
	err,
	errAsync as neverthrowErrAsync,
	okAsync as neverthrowOkAsync,
	ok,
} from 'neverthrow';

export type SDKResult<T, E = Error> = Result<T, E>;
export type SDKResultAsync<T, E = Error> = ResultAsync<T, E>;

const okAsync = neverthrowOkAsync;
const errAsync = neverthrowErrAsync;

export { ok, err, okAsync, errAsync };

/**
 * Wraps a function in a try/catch and returns a Result
 */
export const tryCatch = <T>(fn: () => T): SDKResult<T> => {
	try {
		return ok(fn());
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
};

/**
 * Wraps an async function in a try/catch and returns a ResultAsync
 */
export const tryCatchAsync = <T>(fn: () => Promise<T>): SDKResultAsync<T> => {
	return ResultAsync.fromPromise(fn(), (error) =>
		error instanceof Error ? error : new Error(String(error))
	);
};

/**
 * Error codes for the application
 */
export const ERROR_CODES = {
	UNKNOWN: 'UNKNOWN',
	NOT_FOUND: 'NOT_FOUND',
	UNAUTHORIZED: 'UNAUTHORIZED',
	BAD_REQUEST: 'BAD_REQUEST',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	// Add more error codes as needed
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
