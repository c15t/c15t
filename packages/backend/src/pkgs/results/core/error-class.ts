import type { DoubleTieErrorOptions, ErrorMessageType } from '../types';
import { ERROR_CATEGORIES, ERROR_CODES } from './error-codes';
import { withSpan } from './tracing';

/**
 * Custom error class for DoubleTie errors.
 *
 * This class extends the standard Error object with additional properties
 * such as error codes, status codes, and contextual data to provide
 * rich error information for applications.
 *
 * @remarks
 * The DoubleTieError is designed to be compatible with HTTP responses and API error handling
 * while providing rich context for debugging and error reporting. Use this as the base
 * for all application errors.
 *
 * @example
 * ```typescript
 * // Create and throw a DoubleTie error
 * throw new DoubleTieError('Failed to update subject preferences', {
 *   code: ERROR_CODES.FAILED_TO_UPDATE_CONSENT,
 *   status: 400,
 *   meta: { subjectId: 'sub_x1pftyoufsm7xgo1kv', preferences: { analytics: true } }
 * });
 *
 * // Catch and handle a DoubleTie error
 * try {
 *   // some operation
 * } catch (err) {
 *   if (DoubleTieError.isDoubleTieError(err)) {
 *     console.error(`${err.code}: ${err.message} (${err.category})`);
 *   }
 * }
 * ```
 */
export class DoubleTieError extends Error {
	/**
	 * Error code as defined in ERROR_CODES or custom error codes.
	 * Used to uniquely identify the error type.
	 */
	readonly code: ErrorMessageType;

	/**
	 * HTTP status code if applicable.
	 * Defaults to 500 (Internal Server Error) if not specified.
	 */
	readonly status: number;

	/**
	 * Error category that groups related errors.
	 * Defaults to 'unexpected' if not specified.
	 *
	 * @see ERROR_CATEGORIES for predefined categories
	 */
	readonly category: string;

	/**
	 * Original error that caused this error.
	 * Useful for wrapping and preserving the original error stack trace.
	 */
	readonly cause?: Error;

	/**
	 * Additional metadata about the error.
	 * Can contain any contextual information that might help debugging.
	 */
	readonly meta: Record<string, unknown>;

	/**
	 * Creates a new DoubleTieError instance.
	 *
	 * @param message - Human-readable error message
	 * @param options - Configuration options for the error
	 * @param options.code - Error code identifying the error type
	 * @param options.status - HTTP status code (defaults to 500)
	 * @param options.category - Error category (defaults to 'unexpected')
	 * @param options.cause - Original error that caused this error
	 * @param options.meta - Additional metadata about the error
	 * @param options.data - Legacy parameter (use meta instead)
	 *
	 * @example
	 * ```typescript
	 * const error = new DoubleTieError('Authentication failed', {
	 *   code: ERROR_CODES.UNAUTHORIZED,
	 *   status: 401,
	 *   category: ERROR_CATEGORIES.AUTH,
	 *   meta: { userId: 'usr_abc123' }
	 * });
	 * ```
	 */
	constructor(
		message: string,
		options: DoubleTieErrorOptions = {
			code: ERROR_CODES.UNKNOWN_ERROR,
			status: 500,
			category: ERROR_CATEGORIES.UNEXPECTED,
			cause: undefined,
			meta: {},
		}
	) {
		super(message, { cause: options.cause });

		// Initialize properties
		this.name = this.constructor.name;
		this.code = options.code ?? ERROR_CODES.UNKNOWN_ERROR;
		this.status = options.status ?? 500;
		this.category = options.category ?? ERROR_CATEGORIES.UNEXPECTED;
		this.cause = options.cause;
		this.meta = options.meta ?? {};

		// Add tracing after initialization
		void withSpan('create_doubletie_error', async (span) => {
			span.setAttributes({
				'error.name': this.name,
				'error.message': message,
				'error.code': this.code,
				'error.status': this.status,
				'error.category': this.category,
				'error.has_cause': !!this.cause,
				'error.cause_type': this.cause
					? this.cause.constructor.name
					: undefined,
				'error.has_meta': !!this.meta,
			});

			if (this.cause) {
				span.recordException(this.cause);
			}
		});

		// Capture stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Creates a DoubleTieError from an HTTP response object.
	 *
	 * @param response - The HTTP Response object
	 * @param data - Optional response data that was already parsed
	 * @returns A new DoubleTieError instance with information from the response
	 *
	 * @example
	 * ```typescript
	 * try {
	 *   const response = await fetch('/api/users/123');
	 *   if (!response.ok) {
	 *     throw DoubleTieError.fromResponse(response);
	 *   }
	 *   // Process successful response
	 * } catch (err) {
	 *   // Handle error
	 * }
	 * ```
	 */
	static fromResponse(response: Response, data?: unknown): DoubleTieError {
		// Extract error message from response or data
		let message = `HTTP error ${response.status}`;
		let errorCode: ErrorMessageType = `HTTP ${response.status}`;
		let errorMeta: Record<string, unknown> = {};

		// Try to extract more specific error details from the response data
		if (data && typeof data === 'object' && data !== null) {
			const errorObj = data as Record<string, unknown>;

			if (typeof errorObj.message === 'string') {
				message = errorObj.message;
			}

			if (typeof errorObj.code === 'string') {
				errorCode = errorObj.code;
			}

			// Include any additional error data
			if (typeof errorObj.data === 'object' && errorObj.data !== null) {
				errorMeta = errorObj.data as Record<string, unknown>;
			}
		}

		return new DoubleTieError(message, {
			code: errorCode,
			status: response.status,
			meta: errorMeta,
		});
	}

	/**
	 * Type guard to check if an unknown error is a DoubleTieError.
	 *
	 * @param error - The error to check
	 * @returns True if the error is a DoubleTieError, false otherwise
	 *
	 * @example
	 * ```typescript
	 * try {
	 *   // some operation
	 * } catch (err) {
	 *   if (DoubleTieError.isDoubleTieError(err)) {
	 *     // Handle DoubleTieError
	 *   } else {
	 *     // Handle other errors
	 *   }
	 * }
	 * ```
	 */
	static isDoubleTieError(error: unknown): error is DoubleTieError {
		return error instanceof DoubleTieError;
	}

	/**
	 * Convert the error to a JSON-serializable object.
	 * Useful for logging or sending error details to clients.
	 *
	 * @returns A JSON-serializable object representation of the error
	 *
	 * @example
	 * ```typescript
	 * const error = new DoubleTieError('Not found', { code: ERROR_CODES.NOT_FOUND });
	 * console.log(JSON.stringify(error.toJSON()));
	 * // {"message":"Not found","code":"NOT_FOUND","status":404,...}
	 * ```
	 */
	toJSON(): Record<string, unknown> {
		const json = {
			name: this.name,
			message: this.message,
			code: this.code,
			status: this.status,
			category: this.category,
			meta: this.meta,
			stack: this.stack,
			cause:
				this.cause instanceof Error
					? {
							name: this.cause.name,
							message: this.cause.message,
							stack: this.cause.stack,
						}
					: this.cause,
		};

		// Add tracing without affecting return value
		void withSpan('error_to_json', async (span) => {
			span.setAttributes({
				'json.has_category': !!json.category,
				'json.has_meta': !!json.meta,
				'json.has_stack': !!json.stack,
				'json.has_cause': !!json.cause,
			});
		});

		return json;
	}

	/**
	 * Creates a new error instance with additional metadata merged with the original.
	 * Does not modify the original error instance.
	 *
	 * @param additionalMeta - Additional metadata to add to the error
	 * @returns A new DoubleTieError instance with the combined metadata
	 *
	 * @example
	 * ```typescript
	 * const baseError = new DoubleTieError('Processing failed', {
	 *   code: ERROR_CODES.PROCESSING_ERROR,
	 *   meta: { step: 'validation' }
	 * });
	 *
	 * // Add request context without modifying the original error
	 * const enrichedError = baseError.withMeta({
	 *   requestId: '123abc',
	 *   timestamp: new Date()
	 * });
	 * ```
	 */
	withMeta(additionalMeta: Record<string, unknown>): DoubleTieError {
		return new DoubleTieError(this.message, {
			code: this.code,
			status: this.status,
			category: this.category,
			cause: this.cause,
			meta: { ...this.meta, ...additionalMeta },
		});
	}

	/**
	 * Creates a subclass of DoubleTieError with a custom name.
	 * Useful for creating domain-specific error classes.
	 *
	 * @param name - The name for the new error class
	 * @returns A new error class extending DoubleTieError
	 *
	 * @example
	 * ```typescript
	 * // Create a domain-specific error class
	 * const PaymentError = DoubleTieError.createSubclass('PaymentError');
	 *
	 * // Use the custom error class
	 * throw new PaymentError('Payment processing failed', {
	 *   code: ERROR_CODES.PAYMENT_FAILED,
	 *   status: 400,
	 *   meta: { transactionId: 'tx_123' }
	 * });
	 * ```
	 */
	static createSubclass(name: string): typeof DoubleTieError {
		const ErrorSubclass = class extends DoubleTieError {
			constructor(message: string, options: DoubleTieErrorOptions) {
				super(message, options);
				this.name = name;
			}
		};

		Object.defineProperty(ErrorSubclass, 'name', { value: name });
		return ErrorSubclass;
	}

	/**
	 * Format a validation error into a more user-friendly message.
	 * Especially useful for displaying validation errors from the meta field.
	 *
	 * @param error - The DoubleTieError containing validation details
	 * @returns A formatted string with validation error details
	 *
	 * @example
	 * ```typescript
	 * try {
	 *   // some operation that might throw a validation error
	 * } catch (err) {
	 *   if (DoubleTieError.isDoubleTieError(err)) {
	 *     console.error(DoubleTieError.formatValidationError(err));
	 *   }
	 * }
	 * ```
	 */
	static formatValidationError(error: DoubleTieError): string {
		if (!error.meta) {
			return error.message;
		}

		let formattedMessage = `${error.message} (${error.code})`;

		// Extract validation errors from meta
		if (error.meta.validationErrors) {
			formattedMessage += `\nValidation Errors: ${JSON.stringify(error.meta.validationErrors, null, 2)}`;
		}

		// Include other helpful meta information
		const otherMeta = { ...error.meta };
		otherMeta.validationErrors = undefined;

		if (Object.keys(otherMeta).length > 0) {
			formattedMessage += `\nAdditional Context: ${JSON.stringify(otherMeta, null, 2)}`;
		}

		return formattedMessage;
	}
}
