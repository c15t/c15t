import type { ResponseContext } from './types';

/**
 * Creates a response context object for success or error cases.
 *
 * @param isSuccess - Whether the response was successful
 * @param data - The response data
 * @param error - Error information if the request failed
 * @param response - The raw response object
 * @returns A response context object
 */
export function createResponseContext<T>(
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
}
