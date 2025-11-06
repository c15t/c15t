import type { FetchOptions, ResponseContext } from '../types';
import { LEADING_SLASHES_REGEX } from './constants';
import type { EndpointHandlers } from './types';
import { createErrorResponse, executeHandler } from './utils';

/**
 * Makes a custom API request to any endpoint.
 */
export async function customFetch<
	ResponseType,
	BodyType = unknown,
	QueryType = unknown,
>(
	endpointHandlers: EndpointHandlers,
	dynamicHandlers: Record<
		string,
		(
			options?: FetchOptions<ResponseType, BodyType, QueryType>
		) => Promise<ResponseContext<ResponseType>>
	>,
	path: string,
	options?: FetchOptions<ResponseType, BodyType, QueryType>
): Promise<ResponseContext<ResponseType>> {
	// Extract endpoint name from path
	const endpointName = path.replace(LEADING_SLASHES_REGEX, '').split('/')[0];

	// Check for dynamic handlers first
	const handler = dynamicHandlers[path];

	if (handler) {
		try {
			return await handler(options);
		} catch (error) {
			const errorResponse = createErrorResponse<ResponseType>(
				error instanceof Error ? error.message : String(error),
				0,
				'HANDLER_ERROR',
				error
			);
			return errorResponse;
		}
	}

	// Then check for predefined handlers
	if (!endpointName || !(endpointName in endpointHandlers)) {
		const errorResponse = createErrorResponse<ResponseType>(
			`No endpoint handler found for '${path}'`,
			404,
			'ENDPOINT_NOT_FOUND'
		);
		return errorResponse;
	}

	// Use the predefined handler
	return await executeHandler<ResponseType, BodyType, QueryType>(
		endpointHandlers,
		endpointName as keyof EndpointHandlers,
		options
	);
}
