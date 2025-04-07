/**
 * # DoubleTie Results Package
 *
 * A comprehensive outcome handling system for TypeScript applications that implements
 * the Result pattern for managing both successful results and errors in a type-safe way.
 *
 * ## Key Features
 *
 * - **Type-safe Result pattern**: Based on the neverthrow library for handling outcomes
 * - **Structured error handling**: Rich error objects with codes, categories, and metadata
 * - **Recovery utilities**: Tools for gracefully handling expected error conditions
 * - **Processing pipelines**: Standardized patterns for validation and data retrieval
 * - **Zero dependency** (except for neverthrow)
 * - **H3.js integration**: Full integration with H3.js error handling
 *
 * ## Example Usage
 *
 * ```typescript
 * import {
 *   DoubleTieError,
 *   ERROR_CODES,
 *   ok,
 *   fail,
 *   tryCatchAsync
 * } from '@doubletie/results';
 *
 * // Create a function that returns a Result
 * async function getUserById(id: string) {
 *   return tryCatchAsync(
 *     async () => {
 *       const response = await fetch(`/api/users/${id}`);
 *
 *       if (!response.ok) {
 *         if (response.status === 404) {
 *           throw new DoubleTieError('User not found', {
 *             code: ERROR_CODES.NOT_FOUND,
 *             status: 404
 *           });
 *         }
 *
 *         throw new DoubleTieError('Failed to fetch user', {
 *           code: ERROR_CODES.API_ERROR,
 *           status: response.status
 *         });
 *       }
 *
 *       return response.json();
 *     },
 *     ERROR_CODES.UNKNOWN_ERROR
 *   );
 * }
 *
 * // Use the Result pattern to handle both success and error cases
 * const result = await getUserById('123');
 *
 * result.match(
 *   (user) => {
 *     console.log(`Found user: ${user.name}`);
 *     renderUserProfile(user);
 *   },
 *   (error) => {
 *     if (error.code === ERROR_CODES.NOT_FOUND) {
 *       showNotFoundMessage();
 *     } else {
 *       showErrorMessage(error.message);
 *     }
 *   }
 * );
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from neverthrow that we use
export {
	ok,
	err,
	okAsync,
	errAsync,
	fromPromise,
	Result,
	ResultAsync,
} from 'neverthrow';

// Export our error class
export { DoubleTieError } from './core/error-class';

// Export our types
export type {
	DoubleTieErrorOptions,
	ErrorCategory,
	ErrorMessageType,
	ErrorTransformer,
	SDKResult,
	SDKResultAsync,
} from './types';

// Export our error classes, codes, and categories
export { ERROR_CODES, ERROR_CATEGORIES } from './core/error-codes';

// Export result handling utilities
export {
	fail,
	failAsync,
	tryCatch,
	tryCatchAsync,
	promiseToResult,
} from './results/result-helpers';

// Export recovery utilities
export {
	withFallbackForCodes,
	withFallbackForCategory,
} from './results/recovery-utils';

// Export pipeline utilities
export { validationPipeline } from './pipeline/validation-pipeline';
export { retrievalPipeline } from './pipeline/retrieval-pipeline';

// Export H3.js integration helpers
export {
	createH3ErrorHandler,
	withH3ErrorHandling,
} from './h3-integration';
