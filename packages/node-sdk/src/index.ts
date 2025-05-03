import type { router } from '@c15t/orpc-router/router';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';

/**
 * Configuration options for the C15T SDK client
 */
export interface C15TClientOptions {
	/**
	 * Base URL for the API server
	 * @example "https://api.example.com"
	 */
	baseUrl: string;

	/**
	 * Authentication token (if needed)
	 * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
	 */
	token?: string;

	/**
	 * Additional headers to include with each request
	 */
	headers?: Record<string, string>;

	/**
	 * Prefix path for API endpoints
	 * @default "/rpc"
	 */
	prefix?: string;
}

/**
 * Creates a type-safe C15T client instance
 *
 * @param options - Configuration options for the client
 * @returns A fully typed client for interacting with the C15T API
 *
 * @example
 * ```typescript
 * // Create a client with authentication
 * const client = createC15TClient({
 *   baseUrl: "https://api.example.com",
 *   token: "your-auth-token"
 * });
 *
 * // Now use the client with full type safety
 * const response = await client.users.getProfile({ userId: "123" });
 * ```
 */
export function c15tClient(options: C15TClientOptions) {
	// Prepare authorization header if token is provided
	const authHeaders: Record<string, string> = options.token
		? { Authorization: `Bearer ${options.token}` }
		: {};

	// Prepare the base URL, potentially with prefix
	const baseUrl = new URL(options.baseUrl);

	// If prefix is provided, apply it to the base URL path
	if (options.prefix) {
		baseUrl.pathname = options.prefix;
	}

	// Create the RPC link with the configured options
	const link = new RPCLink({
		url: baseUrl.toString(),
		headers: {
			...authHeaders,
			...options.headers,
		},
	});

	// Create and return the client with a type assertion
	// This approach avoids complex type issues while providing
	// the same runtime functionality
	const client = createORPCClient(link);

	return client as unknown as RouterClient<typeof router>;
}

const c15t = c15tClient({
	baseUrl: 'http://127.0.0.1:3000',
});

c15t.consent.showBanner({});
