/**
 * CORS middleware for c15t
 *
 * This module provides comprehensive CORS (Cross-Origin Resource Sharing) functionality including:
 * - Origin validation with support for wildcards and subdomains
 * - Flexible CORS options configuration
 * - Context processing and enrichment
 * - Protocol-agnostic matching
 * - Support for www and non-www variants
 *
 * @example
 * ```ts
 * import { createCORSOptions, isOriginTrusted, processCors } from '@c15t/backend/middleware/cors';
 *
 * // Create CORS options with trusted origins
 * const corsOptions = createCORSOptions(['https://example.com', '*.trusted-domain.com']);
 *
 * // Process CORS for a request
 * const enrichedContext = processCors(request, context, trustedOrigins);
 *
 * // Validate an origin directly
 * const isTrusted = isOriginTrusted('https://api.trusted-domain.com', trustedOrigins);
 * ```
 *
 * @packageDocumentation
 */

export { createCORSOptions } from './cors';
export { isOriginTrusted } from './is-origin-trusted';
export { processCors } from './process-cors';
