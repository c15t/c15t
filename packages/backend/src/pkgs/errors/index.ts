/**
 * Errors Package
 *
 * This package provides error handling utilities, error code definitions,
 * and result handling functions for C15T.
 */

export { BASE_ERROR_CODES } from './codes';
export type { ErrorCategory, ErrorCode, ErrorMessage } from './codes';
export { C15TError } from './error';
export {
	fail,
	failAsync,
	safeResult,
	safeResultAsync,
	type C15TResult,
	type C15TResultAsync,
} from './results';
export {
	recoverFromCodes,
	recoverFromCategory,
} from './recovery';
export {
	validationPipeline,
	retrievalPipeline,
} from './pipeline';

// Re-export useful types from neverthrow
export { fromPromise, okAsync, ok, Result, ResultAsync } from 'neverthrow';
