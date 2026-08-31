import type { ResponseContext } from './types';

/**
 * Regex pattern to remove leading slashes
 */
export const LEADING_SLASHES_REGEX = /^\/+/u;

/**
 * Creates a response context object for success or error cases.
 *
 * @param isSuccess - Whether the response was successful
 * @param data - The response data
 * @param error - Error information if the request failed
 * @param response - The raw response object
 * @returns A response context object
 */
export const createResponseContext = function createResponseContext<T>(
	isSuccess: boolean,
	data: T | null = null,
	error: {
		message: string;
		status: number;
		code?: string;
		cause?: unknown;
		details?: Record<string, unknown> | null;
	} | null = null,
	response: Response | null = null
): ResponseContext<T> {
	return {
		data,
		error,
		ok: isSuccess,
		response,
	};
};

/**
 * Creates a basic response context for error cases.
 */
export const createErrorResponse = function createErrorResponse<T>(
	message: string,
	status = 500,
	code = 'ERROR',
	cause?: unknown
): ResponseContext<T> {
	return createResponseContext<T>(
		false,
		null,
		{
			cause,
			code,
			message,
			status,
		},
		null
	);
};
