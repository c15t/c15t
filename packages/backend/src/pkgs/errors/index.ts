/**
 * DoubleTie Errors Package
 *
 * This package provides a standardized error handling system for TypeScript applications.
 * It includes error classes, error codes, and utilities for working with the Result pattern.
 *
 * Key features:
 * - A standardized error class (DoubleTieError) with context information
 * - A set of standard error codes that can be extended
 * - Utilities for working with the Result pattern from neverthrow
 * - Recovery mechanisms for handling expected errors
 * - Pipeline patterns for error handling in common scenarios
 *
 * @example
 * ```typescript
 * import {
 *   DoubleTieError,
 *   ERROR_CODES,
 *   SDKResult,
 *   fail,
 *   ok,
 * } from '@doubletie/errors';
 *
 * // Create and throw an error
 * throw new DoubleTieError('User not found', {
 *   code: ERROR_CODES.NOT_FOUND,
 *   status: 404,
 * });
 *
 * // Work with Results
 * function getUser(id: string): SDKResult<User> {
 *   const user = users.find(u => u.id === id);
 *   if (!user) {
 *     return fail('User not found', {
 *       code: ERROR_CODES.NOT_FOUND,
 *       status: 404,
 *     });
 *   }
 *   return ok(user);
 * }
 * ```
 */

// Export error types
export type {
	ErrorCategory,
	ErrorMessageType,
	ErrorCodeMap,
	ErrorCategoryMap,
	DoubleTieErrorOptions,
	SDKResult,
	SDKResultAsync,
	ErrorTransformer,
	ValidationErrorDetails,
} from './types';

// Export error class
export { DoubleTieError } from './core/error-class';

// Export error codes
export {
	ERROR_CODES,
	ERROR_CATEGORIES,
	createErrorCodes,
	createErrorCategories,
	type ErrorCode,
} from './core/error-codes';

// Export result handling utilities
export {
	ok,
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

// Re-export useful types from neverthrow
export type { Result, ResultAsync } from 'neverthrow';
export { errAsync, fromPromise, okAsync } from 'neverthrow';
