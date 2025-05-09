import { contracts } from '@c15t/backend/contracts';
import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import type { JsonifiedClient } from '@orpc/openapi-client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';

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
	 * @default "/"
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

	const link = new OpenAPILink(contracts, {
		url: baseUrl.toString(),
		headers: {
			...authHeaders,
			...options.headers,
		},
	});

	// Create and return the client with a type assertion
	// This approach avoids complex type issues while providing
	// the same runtime functionality

	return createORPCClient(link) as JsonifiedClient<
		ContractRouterClient<typeof contracts>
	>;
}
