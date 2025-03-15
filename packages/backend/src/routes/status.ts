import { createSDKEndpoint } from '~/pkgs/api-router';

/**
 * Response type for the status endpoint
 * @public
 */
export interface StatusResponse {
	status: 'ok' | 'error';
	version: string;
	timestamp: string;
	storage: {
		type: string;
		available: boolean;
	};
}

/**
 * Status endpoint that returns information about the c15t instance.
 *
 * This endpoint provides basic operational information about the c15t instance,
 * including its version, current timestamp, and storage adapter configuration.
 * It can be used for:
 * - Health checks to verify the API is operational
 * - Version verification
 * - Storage adapter verification
 * - Retrieving configuration information about the consent system
 *
 * The endpoint does not require authentication and is accessible via a GET request.
 *
 * @endpoint GET /status
 * @responseExample
 * ```json
 * {
 *   "status": "ok",
 *   "version": "1.0.0",
 *   "timestamp": "2023-04-01T12:34:56.789Z",
 *   "storage": {
 *     "type": "MemoryAdapter",
 *     "available": true
 *   }
 * }
 * ```
 */
export const status = createSDKEndpoint(
	'/status',
	{
		method: 'GET',
	},
	async (ctx) => {
		const response: StatusResponse = {
			status: 'ok',
			version: '1.0.0',
			timestamp: new Date().toISOString(),
			storage: {
				type: ctx.context?.adapter?.id ?? 'Unavailable',
				available: !!ctx.context?.adapter,
			},
		};

		return response;
	}
);
