import type { FetchOptions, ResponseContext } from '../types';
import { createErrorResponse as createErrorResponseShared } from '../utils';
import type { EndpointHandlers } from './types';

/**
 * Creates a basic response context for error cases.
 */
export function createErrorResponse<T>(
	message: string,
	status = 500,
	code = 'HANDLER_ERROR',
	cause?: unknown
): ResponseContext<T> {
	return createErrorResponseShared<T>(message, status, code, cause);
}

/**
 * Handles execution of a specific endpoint handler.
 */
export async function executeHandler<
	ResponseType,
	BodyType = unknown,
	QueryType = unknown,
>(
	endpointHandlers: EndpointHandlers,
	handlerKey: keyof EndpointHandlers,
	options?: FetchOptions<ResponseType, BodyType, QueryType>
): Promise<ResponseContext<ResponseType>> {
	// Check if handler exists
	const handler = endpointHandlers[handlerKey] as (
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	) => Promise<ResponseContext<ResponseType>>;

	if (!handler) {
		const errorResponse = createErrorResponse<ResponseType>(
			`No endpoint handler found for '${String(handlerKey)}'`,
			404,
			'ENDPOINT_NOT_FOUND'
		);

		if (options?.throw) {
			throw new Error(`No endpoint handler found for '${String(handlerKey)}'`);
		}

		return errorResponse;
	}

	try {
		// Execute the handler
		const response = await handler(options);

		// Ensure response has consistent structure
		const normalizedResponse: ResponseContext<ResponseType> = {
			data: response.data,
			error: response.error,
			ok: response.ok ?? !response.error,
			response: response.response,
		};

		return normalizedResponse;
	} catch (error) {
		// Handle errors from the handler
		const errorResponse = createErrorResponse<ResponseType>(
			error instanceof Error ? error.message : String(error),
			0,
			'HANDLER_ERROR',
			error
		);

		if (options?.throw) {
			throw error;
		}

		return errorResponse;
	}
}
