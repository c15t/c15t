/**
 * CORS middleware for c15t
 *
 * This module provides CORS functionality including:
 * - Origin validation
 * - CORS options configuration
 * - Context processing
 */

export { createCORSOptions } from './cors';
export { isOriginTrusted } from './is-origin-trusted';
export { processCors } from './process-cors';
