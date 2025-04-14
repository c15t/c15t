import type { H3Error } from 'h3';
import type { Result, ResultAsync } from 'neverthrow';

/**
 * Represents a category of errors for better organization and filtering.
 *
 * @remarks
 * Error categories allow grouping related errors together and can be used
 * for filtering, routing, or specialized handling of different error types.
 *
 * @see ERROR_CATEGORIES for predefined categories
 *
 * @example
 * ```typescript
 * // Using a predefined category
 * const error = new DoubleTieError('Not authorized', {
 *   code: ERROR_CODES.UNAUTHORIZED,
 *   category: ERROR_CATEGORIES.AUTH
 * });
 * ```
 */
export type ErrorCategory = string;

/**
 * Represents an error code message used for identifying error types.
 *
 * @remarks
 * Error codes should be unique identifiers that help track and identify
 * specific error conditions throughout the application.
 *
 * @see ERROR_CODES for predefined error codes
 *
 * @example
 * ```typescript
 * // Using a predefined error code
 * const error = new DoubleTieError('Resource not found', {
 *   code: ERROR_CODES.NOT_FOUND
 * });
 * ```
 */
export type ErrorMessageType = string;

/**
 * Forward declaration of the DoubleTieError class to avoid circular imports.
 * Actual implementation is in error-class.ts
 *
 * @remarks
 * This interface defines the public API of the DoubleTieError class.
 * It extends the H3Error class with additional properties and methods
 * specific to the DoubleTie error handling system.
 *
 * @see DoubleTieErrorOptions for the options used to construct a DoubleTieError
 */
export interface DoubleTieError
  extends H3Error<{
    code: ErrorMessageType;
    category?: ErrorCategory;
    meta?: Record<string, unknown>;
  }> {
  /**
   * Error code identifying the error type
   */
  readonly code: ErrorMessageType;

  /**
   * Category for grouping related errors
   */
  readonly category: ErrorCategory;

  /**
   * Additional metadata about the error
   */
  readonly meta: Record<string, unknown>;

  /**
   * Creates a new error instance with additional metadata
   */
  withMeta(additionalMeta: Record<string, unknown>): DoubleTieError;
}

/**
 * Options for constructing a DoubleTieError
 *
 * @remarks
 * This interface defines all the configuration options available
 * when creating a new DoubleTieError instance.
 *
 * @example
 * ```typescript
 * const options: DoubleTieErrorOptions = {
 *   code: ERROR_CODES.VALIDATION_ERROR,
 *   status: 400,
 *   category: ERROR_CATEGORIES.VALIDATION,
 *   meta: { field: 'email', value: 'invalid' }
 * };
 *
 * const error = new DoubleTieError('Invalid email format', options);
 * ```
 */
export interface DoubleTieErrorOptions {
  /**
   * Error code from ERROR_CODES or custom error codes.
   * Used to uniquely identify the error type.
   */
  code: ErrorMessageType;

  /**
   * HTTP status code if applicable.
   * Defaults to 500 (Internal Server Error) if not specified.
   */
  status?: number;

  /**
   * Category to classify the error.
   * Defaults to 'unexpected' if not specified.
   */
  category?: ErrorCategory;

  /**
   * Original error that caused this error.
   * Useful for wrapping and preserving the original error stack trace.
   */
  cause?: Error;

  /**
   * Additional metadata about the error.
   * Can contain any contextual information that might help debugging.
   */
  meta?: Record<string, unknown>;
}

/**
 * Represents a synchronous result that may contain a value of type TValue or a DoubleTieError.
 * Based on the Result type from the neverthrow library.
 *
 * @template TValue - The type of the success value
 *
 * @remarks
 * SDKResult is a wrapper around the neverthrow Result type specialized to use DoubleTieError
 * as the error type. It provides methods to safely handle both success and error cases.
 *
 * @example
 * ```typescript
 * // Creating and using a result
 * const result: SDKResult<User> = getUserById(123);
 *
 * // Safely handling the result
 * result.match(
 *   (user) => console.log(`Found user: ${user.name}`),
 *   (error) => console.error(`Error: ${error.message}`)
 * );
 *
 * // Using the result with other functions
 * const nameResult = result.map(user => user.name);
 * ```
 */
export type SDKResult<TValue> = Result<TValue, DoubleTieError>;

/**
 * Represents an asynchronous result that may contain a value of type TValue or a DoubleTieError.
 * Based on the ResultAsync type from the neverthrow library.
 *
 * @template TValue - The type of the success value
 *
 * @remarks
 * SDKResultAsync is a wrapper around the neverthrow ResultAsync type specialized to use DoubleTieError
 * as the error type. It provides methods to safely handle both success and error cases in asynchronous operations.
 *
 * @example
 * ```typescript
 * // Creating and using an async result
 * const resultAsync: SDKResultAsync<User> = getUserByIdAsync(123);
 *
 * // Safely handling the result
 * await resultAsync.match(
 *   (user) => console.log(`Found user: ${user.name}`),
 *   (error) => console.error(`Error: ${error.message}`)
 * );
 *
 * // Chaining async operations
 * const profileResult = await resultAsync
 *   .andThen(user => getProfileByUserId(user.id));
 * ```
 */
export type SDKResultAsync<TValue> = ResultAsync<TValue, DoubleTieError>;

/**
 * Callback function type for mapping errors to DoubleTieErrors.
 * Used in utility functions like tryCatch and tryCatchAsync to transform
 * arbitrary errors into DoubleTieErrors.
 *
 * @template TError - The type of the original error
 *
 * @example
 * ```typescript
 * const errorTransformer: ErrorTransformer = (error) => {
 *   if (error instanceof NetworkError) {
 *     return new DoubleTieError('Network connection failed', {
 *       code: ERROR_CODES.NETWORK_ERROR,
 *       status: 503,
 *       cause: error
 *     });
 *   }
 *   return new DoubleTieError('Unknown error occurred', {
 *     code: ERROR_CODES.UNKNOWN_ERROR,
 *     cause: error
 *   });
 * };
 *
 * // Using the transformer with tryCatch
 * const result = tryCatch(() => riskyOperation(), ERROR_CODES.OPERATION_FAILED, errorTransformer);
 * ```
 */
export type ErrorTransformer<TError extends Error = Error> = (
  error: TError
) => DoubleTieError;
