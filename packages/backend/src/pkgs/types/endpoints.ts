import type { H3Event } from 'h3';

export interface EndpointOptions {
	/**
	 * Whether authentication is required for this endpoint
	 */
	auth?: boolean;

	/**
	 * Custom middleware to run before the endpoint
	 */
	middleware?: EndpointMiddleware[];
}

export type EndpointMiddleware = (event: H3Event) => Promise<void>;

export type EndpointHandler = (event: H3Event) => Promise<unknown>;

/**
 * Native H3 endpoint interface
 */
export interface Endpoint {
	/**
	 * The endpoint handler function
	 */
	handler: EndpointHandler;

	/**
	 * Configuration options for the endpoint
	 */
	options?: EndpointOptions;

	/**
	 * The path for this endpoint
	 */
	path: string;
}
