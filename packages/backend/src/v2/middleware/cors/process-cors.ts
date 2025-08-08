/**
 * CORS processing middleware for c15t
 * Handles origin validation and context enrichment
 *
 * @packageDocumentation
 */

import type { C15TContext } from '~/v2/types';
import { isOriginTrusted } from './is-origin-trusted';

/**
 * Result of CORS processing
 * @internal
 */
interface CORSProcessingResult {
	/** The origin from the request */
	origin: string | null;
	/** Whether the origin is trusted */
	isTrusted: boolean;
}

/**
 * Extracts and validates CORS information from a request
 *
 * @param request - The request to process
 * @param trustedOrigins - Array of trusted origins
 * @param logger - Optional logger for debugging
 * @returns CORS processing result
 *
 * @internal
 */
function extractCORSInfo(
	request: Request,
	trustedOrigins?: string[],
	logger?: C15TContext['logger']
): CORSProcessingResult {
	const origin = request.headers.get('origin');

	if (!origin || !trustedOrigins) {
		return {
			origin: origin,
			isTrusted: false,
		};
	}

	return {
		origin,
		isTrusted: isOriginTrusted(origin, trustedOrigins, logger),
	};
}

/**
 * Processes CORS validation for an incoming request and enriches the context
 * with origin information. This middleware function validates the origin against
 * trusted patterns and updates the context with the validation results.
 *
 * @param request - The incoming HTTP request to process
 * @param context - The c15t middleware context to enrich
 * @param trustedOrigins - Array of trusted origin patterns. Can include wildcards ('*')
 *
 * @returns The enriched context with origin validation results
 *
 * @example
 * ```ts
 * const enrichedContext = processCors(
 *   request,
 *   context,
 *   ['https://example.com', '*.trusted-domain.com']
 * );
 * ```
 *
 * @see {@link isOriginTrusted} for origin validation details
 */
export const processCors = (
	request: Request,
	context: C15TContext,
	trustedOrigins?: string[]
): C15TContext => {
	const { origin, isTrusted } = extractCORSInfo(
		request,
		trustedOrigins,
		context.logger
	);

	if (origin) {
		context.origin = origin;
		context.trustedOrigin = isTrusted;
	}

	return context;
};
