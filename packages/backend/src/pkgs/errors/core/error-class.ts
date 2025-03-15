import type { DoubleTieErrorOptions, ErrorMessageType } from '../types';
import { ERROR_CATEGORIES } from './error-codes';

/**
 * Custom error class for DoubleTie errors.
 *
 * This class extends the standard Error object with additional properties
 * such as error codes, status codes, and contextual data to provide
 * rich error information for applications.
 *
 * @example
 * ```typescript
 * // Create and throw a DoubleTie error
 * throw new DoubleTieError('Failed to update subject preferences', {
 *   code: ERROR_CODES.FAILED_TO_UPDATE_CONSENT,
 *   status: 400,
 *   meta: { subjectId: 'sub_x1pftyoufsm7xgo1kv', preferences: { analytics: true } }
 * });
 * ```
 */
export class DoubleTieError extends Error {
	/**
	 * Error code as defined in ERROR_CODES or custom error codes
	 */
	readonly code: ErrorMessageType;

	/**
	 * HTTP status code if applicable
	 */
	readonly status: number;

	/**
	 * Error category
	 */
	readonly category: string;

	/**
	 * Original error that caused this error
	 */
	readonly cause?: Error;

	/**
	 * Additional metadata about the error
	 */
	readonly meta: Record<string, unknown>;

	/**
	 * Creates a new DoubleTieError instance.
	 *
	 * @param message - Human-readable error message
	 * @param options - Additional error options including code, status, and metadata
	 */
	constructor(
		message: string,
		{
			code,
			status = 500,
			category = ERROR_CATEGORIES.UNEXPECTED,
			cause,
			meta = {},
			data,
		}: DoubleTieErrorOptions
	) {
		super(message, { cause });
		this.name = this.constructor.name;

		this.code = code;
		this.status = status;
		this.category = category;
		this.cause = cause;

		// Handle backward compatibility with data property
		this.meta = data ? { ...meta, ...data } : meta;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Creates a DoubleTieError from an HTTP response and optional response data.
	 *
	 * @param response - The HTTP Response object
	 * @param data - Optional parsed response data
	 * @returns A new DoubleTieError instance with appropriate properties
	 * @throws {Error} When the response is invalid or missing required properties
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
	 * Determines if an unknown error is a DoubleTieError.
	 *
	 * @param error - The error to check
	 * @returns True if the error is a DoubleTieError instance
	 */
	static isDoubleTieError(error: unknown): error is DoubleTieError {
		return error instanceof DoubleTieError;
	}

	/**
	 * Create a JSON representation of the error
	 * This is useful for logging and API responses
	 *
	 * @returns A JSON-serializable object representing the error
	 */
	toJSON(): Record<string, unknown> {
		return {
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
	}

	/**
	 * Create an extended version of this error with additional metadata
	 *
	 * @param additionalMeta - Additional metadata to add to the error
	 * @returns A new DoubleTieError with combined metadata
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
	 * Create a subclass of DoubleTieError for domain-specific errors
	 *
	 * @param name - Name of the error class
	 * @returns A subclass of DoubleTieError
	 *
	 * @example
	 * ```typescript
	 * const BillingError = DoubleTieError.createSubclass('BillingError');
	 *
	 * // Later in your code
	 * throw new BillingError('Payment failed', {
	 *   code: BILLING_ERROR_CODES.PAYMENT_FAILED,
	 *   status: 400,
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
}
