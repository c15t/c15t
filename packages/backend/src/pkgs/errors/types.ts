import { type Result, type ResultAsync } from 'neverthrow';
import type { ZodFormattedError } from 'zod';

/**
 * Represents a category of errors for better organization and filtering
 */
export type ErrorCategory = string;

/**
 * Represents an error code message used for identifying error types
 */
export type ErrorMessageType = string;

/**
 * Represents a collection of error codes mapped to their message values
 */
export type ErrorCodeMap = Readonly<Record<string, ErrorMessageType>>;

/**
 * Represents a collection of error categories mapped to their string values
 */
export type ErrorCategoryMap = Readonly<Record<string, ErrorCategory>>;

/**
 * Forward declaration of the DoubleTieError class to avoid circular imports
 * Actual implementation is in error-class.ts
 */
export interface DoubleTieError extends Error {
	readonly code: ErrorMessageType;
	readonly status: number;
	readonly category: ErrorCategory;
	readonly cause?: Error;
	readonly meta: Record<string, unknown>;
	toJSON(): Record<string, unknown>;
	withMeta(additionalMeta: Record<string, unknown>): DoubleTieError;
}

/**
 * Options for constructing a DoubleTieError
 */
export interface DoubleTieErrorOptions {
	/**
	 * Error code from ERROR_CODES or custom error codes
	 */
	code: ErrorMessageType;

	/**
	 * HTTP status code if applicable
	 */
	status?: number;

	/**
	 * Category to classify the error
	 */
	category?: ErrorCategory;

	/**
	 * Original error that caused this error
	 */
	cause?: Error;

	/**
	 * Additional metadata about the error
	 */
	meta?: Record<string, unknown>;

	/**
	 * @deprecated Use meta instead
	 * Additional data about the error (backward compatibility)
	 */
	data?: Record<string, unknown>;
}

/**
 * Represents a synchronous result that may contain a value of type TValue or a DoubleTieError.
 * Based on the Result type from the neverthrow library.
 *
 * @template TValue - The type of the success value
 */
export type SDKResult<TValue> = Result<TValue, DoubleTieError>;

/**
 * Represents an asynchronous result that may contain a value of type TValue or a DoubleTieError.
 * Based on the ResultAsync type from the neverthrow library.
 *
 * @template TValue - The type of the success value
 */
export type SDKResultAsync<TValue> = ResultAsync<TValue, DoubleTieError>;

/**
 * Callback function type for mapping errors to DoubleTieErrors
 *
 * @template TError - The type of the original error
 */
export type ErrorTransformer<TError extends Error = Error> = (
	error: TError
) => DoubleTieError;

/**
 * Parameters for a log handler function
 * Used for validation pipeline error handling
 */
export interface ValidationErrorDetails {
	validationErrors: ZodFormattedError<unknown, string>;
	[key: string]: unknown;
}
