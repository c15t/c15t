import type { ResponseContext } from './types';
/**
 * Regex pattern to remove leading slashes
 */
export declare const LEADING_SLASHES_REGEX: RegExp;
/**
 * Creates a response context object for success or error cases.
 *
 * @param isSuccess - Whether the response was successful
 * @param data - The response data
 * @param error - Error information if the request failed
 * @param response - The raw response object
 * @returns A response context object
 */
export declare function createResponseContext<T>(
	isSuccess: boolean,
	data?: T | null,
	error?: {
		message: string;
		status: number;
		code?: string;
		cause?: unknown;
		details?: Record<string, unknown> | null;
	} | null,
	response?: Response | null
): ResponseContext<T>;
/**
 * Creates a basic response context for error cases.
 */
export declare function createErrorResponse<T>(
	message: string,
	status?: number,
	code?: string,
	cause?: unknown
): ResponseContext<T>;
