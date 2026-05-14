import type { RetryConfig } from '../types';
/**
 * Default retry configuration
 * @internal
 */
export declare const DEFAULT_RETRY_CONFIG: RetryConfig;
/**
 * Regex pattern to match absolute URLs (those with a protocol like http:// or https://)
 */
export declare const ABSOLUTE_URL_REGEX: RegExp;
/**
 * Regex pattern to remove leading slashes
 * Re-exported from shared utils for convenience
 */
export declare const LEADING_SLASHES_REGEX: RegExp;
/**
 * Regex pattern to remove trailing slashes
 */
export declare const TRAILING_SLASHES_REGEX: RegExp;
