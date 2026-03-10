/**
 * Shared C15T client instance for server-side usage.
 *
 * This file creates a singleton client that can be imported in server components,
 * API routes, and other server-side code.
 *
 * @example
 * ```typescript
 * import { consentClient } from '@/lib/c15t-client';
 *
 * // In a server component
 * const result = await consentClient.checkConsent({
 *   externalId: 'user_123',
 *   type: 'analytics',
 * });
 * ```
 */

import { c15tClient } from '@c15t/node-sdk';

/**
 * Singleton C15T client instance configured from environment variables.
 *
 * Uses C15T_API_URL environment variable, defaulting to the local self-host API.
 */
export const consentClient = c15tClient({
	baseUrl: process.env.C15T_API_URL || 'http://localhost:3000/api/self-host',
});
