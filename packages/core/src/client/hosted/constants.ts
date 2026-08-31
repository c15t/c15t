import type { RetryConfig } from '../types';
import { LEADING_SLASHES_REGEX as LEADING_SLASHES_REGEX_SHARED } from '../utils';

/**
 * Default retry configuration
 * @internal
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	backoffFactor: 2,
	initialDelayMs: 100,
	// Setting to 0 will still allow the initial request but no retries
	maxRetries: 3,
	// Never retry client errors, especially 404
	nonRetryableStatusCodes: [400, 401, 403, 404],
	retryOnNetworkError: true,
	// Default retryable server errors
	retryableStatusCodes: [500, 502, 503, 504],
	shouldRetry: undefined,
};

/**
 * Regex pattern to match absolute URLs (those with a protocol like http:// or https://)
 */
export const ABSOLUTE_URL_REGEX = /^(?:[a-z+]+:)?\/\//iu;

/**
 * Regex pattern to remove leading slashes
 * Re-exported from shared utils for convenience
 */
export const LEADING_SLASHES_REGEX = LEADING_SLASHES_REGEX_SHARED;

/**
 * Regex pattern to remove trailing slashes
 */
export const TRAILING_SLASHES_REGEX = /\/+$/u;
