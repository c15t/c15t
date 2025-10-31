import type { FetchOptions, ResponseContext } from '../types';
import { createResponseContext as createResponseContextShared } from '../utils';

/**
 * Creates a response context object for success cases.
 */
export function createResponseContext<T>(
	data: T | null = null
): ResponseContext<T> {
	return createResponseContextShared<T>(true, data);
}

/**
 * Handles empty API response with callbacks.
 */
export async function handleOfflineResponse<ResponseType>(
	options?: FetchOptions<ResponseType>
): Promise<ResponseContext<ResponseType>> {
	const emptyResponse = createResponseContext<ResponseType>();

	// Call success callback if provided
	if (options?.onSuccess) {
		await options.onSuccess(emptyResponse);
	}

	return emptyResponse;
}
