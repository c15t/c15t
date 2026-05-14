import type { FetchOptions, ResponseContext } from '../types';
import type { EndpointHandlers } from './types';
/**
 * Creates a basic response context for error cases.
 */
export declare function createErrorResponse<T>(
	message: string,
	status?: number,
	code?: string,
	cause?: unknown
): ResponseContext<T>;
/**
 * Handles execution of a specific endpoint handler.
 */
export declare function executeHandler<
	ResponseType,
	BodyType = unknown,
	QueryType = unknown,
>(
	endpointHandlers: EndpointHandlers,
	handlerKey: keyof EndpointHandlers,
	options?: FetchOptions<ResponseType, BodyType, QueryType>
): Promise<ResponseContext<ResponseType>>;
