import { C15TClient } from './client';
import type { C15TClientOptions } from './types';

/**
 * Creates a type-safe C15T client instance
 *
 * @param options - Configuration options for the client. If not provided,
 *                  falls back to C15T_API_URL and C15T_API_TOKEN environment variables.
 * @returns A C15TClient instance for interacting with the C15T API
 *
 * @example
 * ```typescript
 * // Auto-configure from environment variables
 * const client = c15tClient();
 *
 * // Or provide explicit options
 * const client = c15tClient({
 *   baseUrl: "https://api.example.com",
 *   token: "your-auth-token"
 * });
 *
 * // Check API status
 * const status = await client.meta.status();
 *
 * // Initialize consent manager
 * const init = await client.meta.init();
 *
 * // Create a subject with consent
 * const subject = await client.subjects.create({
 *   type: 'cookie_banner',
 *   subjectId: 'sub_123',
 *   domain: 'example.com',
 *   preferences: { analytics: true },
 *   givenAt: Date.now(),
 * });
 * ```
 */
export function c15tClient(options?: C15TClientOptions): C15TClient {
	return new C15TClient(options);
}

// Re-export schema types for convenience
export type {
	CheckConsentOutput,
	CheckConsentQuery,
	ConsentCheckResult,
	ConsentItem,
	GetSubjectInput,
	GetSubjectOutput,
	GetSubjectParams,
	GetSubjectQuery,
	InitOutput,
	ListSubjectsOutput,
	ListSubjectsQuery,
	PatchSubjectFullInput,
	PatchSubjectOutput,
	PostSubjectInput,
	PostSubjectOutput,
	StatusOutput,
	SubjectItem,
} from '@c15t/schema/types';
// Export the client class for direct instantiation
export { C15TClient } from './client';
// Export custom error class
export { C15TError, isC15TError } from './error';
export type { FetcherContext } from './fetcher';
// Export fetcher utilities for advanced usage
export { createResponseContext, fetcher, resolveUrl } from './fetcher';
// Export types
export type {
	C15TClientOptions,
	FetchOptions,
	ResponseContext,
	RetryConfig,
} from './types';
