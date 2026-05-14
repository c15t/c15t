import type { FetchOptions, ResponseContext } from '../types';
import type { EndpointHandlers } from './types';
/**
 * Makes a custom API request to any endpoint.
 */
export declare function customFetch<
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
): Promise<ResponseContext<ResponseType>>;
