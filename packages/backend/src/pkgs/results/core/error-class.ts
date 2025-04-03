import { H3Error } from 'h3';
import type { DoubleTieErrorOptions, ErrorMessageType } from '../types';
import { ERROR_CATEGORIES, ERROR_CODES } from './error-codes';
import { withSpan } from './tracing';

/**
 * Custom error class for DoubleTie errors that extends H3Error.
 *
 * This class directly extends H3Error to provide seamless integration with H3.js
 * while adding application-specific error properties and context.
 *
 * @remarks
 * The DoubleTieError is designed to be compatible with HTTP responses and API error handling
 * while providing rich context for debugging and error reporting.
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
export class DoubleTieError extends H3Error<{
	code: ErrorMessageType;
	category?: string;
	meta?: Record<string, unknown>;
	originalMessage?: string;
}> {
	/**
	 * Error code as defined in ERROR_CODES or custom error codes.
	 * Used to uniquely identify the error type.
	 */
	readonly code: ErrorMessageType;

	/**
	 * Error category that groups related errors.
	 * Defaults to 'unexpected' if not specified.
	 *
	 * @see ERROR_CATEGORIES for predefined categories
	 */
	readonly category: string;

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
		this.statusCode = options.status ?? 500;
		this.category = options.category ?? ERROR_CATEGORIES.UNEXPECTED;
		this.meta = options.meta ?? {};

		// Set H3Error data property with our structured data
		this.data = {
			code: this.code,
			category: this.category,
			meta: this.meta,
		};

		// Add tracing after initialization
		void withSpan('create_doubletie_error', async (span) => {
			span.setAttributes({
				'error.name': this.name,
				'error.message': message,
				'error.code': this.code,
				'error.status': this.statusCode,
				'error.category': this.category,
				'error.has_cause': !!this.cause,
				'error.cause_type':
					this.cause instanceof Error
						? this.cause.constructor.name
						: typeof this.cause,
				'error.has_meta': !!this.meta,
			});

			if (this.cause instanceof Error) {
				span.recordException(this.cause);
			}
		});

		// Capture stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Type guard to check if an unknown error is a DoubleTieError.
	 *
	 * @param error - The error to check
	 * @returns True if the error is a DoubleTieError, false otherwise
	 */
	static isDoubleTieError(error: unknown): error is DoubleTieError {
		return error instanceof DoubleTieError;
	}

	/**
	 * Convert the error to a JSON-serializable object.
	 */
	toJSON(): Pick<
		H3Error<{
			code: string;
			category?: string;
			meta?: Record<string, unknown>;
			originalMessage?: string;
		}>,
		'message' | 'data' | 'statusCode' | 'statusMessage'
	> {
		// Extract validation error details if present
		const validationErrorMessage = this.meta?.validationErrors
			? String(this.meta.validationErrors)
			: undefined;

		// Parse stack trace into an array if available
		const stackTrace = this.stack
			? this.stack
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line && !line.includes('Error: '))
			: [];

		// Create the result object with proper structure matching H3Error toJSON return type
		return {
			statusCode: this.statusCode,
			message: validationErrorMessage || this.message,
			statusMessage: this.statusMessage,
			data: {
				code: this.code,
				category: this.category,
				meta: this.meta,
				//@ts-expect-error
				stack: stackTrace,
				// Add originalMessage if we're showing validation error as main message
				...(validationErrorMessage && this.message
					? { originalMessage: this.message }
					: {}),
				// Add cause information if available
				...(this.cause
					? {
							cause:
								this.cause instanceof Error
									? {
											name: this.cause.name,
											message: this.cause.message,
											stack: this.cause.stack
												? this.cause.stack
														.split('\n')
														.map((line) => line.trim())
												: undefined,
										}
									: this.cause,
						}
					: {}),
			},
		};
	}

	/**
	 * Creates a DoubleTieError from an HTTP response object.
	 *
	 * @param response - The HTTP Response object
	 * @param data - Optional response data that was already parsed
	 * @returns A new DoubleTieError instance with information from the response
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
	 * Creates a new error instance with additional metadata merged with the original.
	 * Does not modify the original error instance.
	 *
	 * @param additionalMeta - Additional metadata to add to the error
	 * @returns A new DoubleTieError instance with the combined metadata
	 */
	withMeta(additionalMeta: Record<string, unknown>): DoubleTieError {
		return new DoubleTieError(this.message, {
			code: this.code,
			status: this.statusCode,
			category: this.category,
			cause: this.cause instanceof Error ? this.cause : undefined,
			meta: { ...this.meta, ...additionalMeta },
		});
	}

	/**
	 * Creates a subclass of DoubleTieError with a custom name.
	 * Useful for creating domain-specific error classes.
	 *
	 * @param name - The name for the new error class
	 * @returns A new error class extending DoubleTieError
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

		// Create a new object without validationErrors instead of using delete
		const otherMeta = Object.fromEntries(
			Object.entries(error.meta).filter(([key]) => key !== 'validationErrors')
		);

		if (Object.keys(otherMeta).length > 0) {
			formattedMessage += `\nAdditional Context: ${JSON.stringify(otherMeta, null, 2)}`;
		}

		return formattedMessage;
	}
}
