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

export type EndpointMiddleware = (request: Request) => Promise<void>;

export type EndpointHandler = (request: Request) => Promise<unknown>;

/**
 * Native endpoint interface
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
