import {
	BASE_ERROR_CODES,
	type ErrorCategory,
	type ErrorMessage,
} from './codes';

/**
 * Custom error class for c15t consent management errors.
 *
 * This class extends the standard Error object with additional properties
 * specific to the c15t consent management system, such as error codes,
 * status codes, and contextual data.
 *
 * @example
 * ```typescript
 * // Create and throw a c15t error
 * throw new C15TError('Failed to update subject preferences', {
 *   code: BASE_ERROR_CODES.FAILED_TO_UPDATE_CONSENT,
 *   status: 400,
 *   data: { subjectId: 'sub_x1pftyoufsm7xgo1kv', preferences: { analytics: true } }
 * });
 *
 * // Create an error from an HTTP response
 * const error = C15TError.fromResponse(response, await response.json());
 * ```
 */
export class C15TError extends Error {
	/**
	 * The error code identifying the type of error
	 */
	code?: ErrorMessage;

	/**
	 * HTTP status code associated with this error
	 */
	status?: number;

	/**
	 * Additional data providing context about the error
	 */
	data?: Record<string, unknown>;

	/**
	 * Category of the error for better organization
	 */
	category?: ErrorCategory;

	/**
	 * Creates a new C15TError instance.
	 *
	 * @param message - Human-readable error message
	 * @param options - Additional error options including code, status, and data
	 */
	constructor(
		message: string,
		options?: {
			/**
			 * The error code identifying the type of error
			 */
			code?: ErrorMessage;

			/**
			 * HTTP status code associated with this error
			 */
			status?: number;

			/**
			 * Additional data providing context about the error
			 */
			data?: Record<string, unknown>;

			/**
			 * Category of the error for better organization
			 */
			category?: ErrorCategory;
		}
	) {
		super(message);
		this.name = 'C15TError';

		if (options) {
			this.code = options.code;
			this.status = options.status;
			this.data = options.data;
			this.category = options.category;
		}

		// Ensure prototype chain works correctly
		Object.setPrototypeOf(this, C15TError.prototype);
	}

	/**
	 * Creates a C15TError from an HTTP response and optional response data.
	 *
	 * @param response - The HTTP Response object
	 * @param data - Optional parsed response data
	 * @returns A new C15TError instance with appropriate properties
	 */
	static fromResponse(response: Response, data?: unknown): C15TError {
		// Extract error message from response or data
		let message = `HTTP error ${response.status}`;
		let code: ErrorMessage | undefined;
		let errorData: Record<string, unknown> | undefined;

		// Try to extract more specific error details from the response data
		if (data && typeof data === 'object' && data !== null) {
			const errorObj = data as Record<string, unknown>;

			if (typeof errorObj.message === 'string') {
				message = errorObj.message;
			}

			if (typeof errorObj.code === 'string') {
				// Check if the code matches one of our known error codes
				const isKnownCode = Object.values(BASE_ERROR_CODES).includes(
					errorObj.code as ErrorMessage
				);
				if (isKnownCode) {
					code = errorObj.code as ErrorMessage;
				}
			}

			// Include any additional error data
			if (typeof errorObj.data === 'object' && errorObj.data !== null) {
				errorData = errorObj.data as Record<string, unknown>;
			}
		}

		return new C15TError(message, {
			code,
			status: response.status,
			data: errorData,
		});
	}

	/**
	 * Determines if an unknown error is a C15TError.
	 *
	 * @param error - The error to check
	 * @returns True if the error is a C15TError instance
	 */
	static isC15TError(error: unknown): error is C15TError {
		return error instanceof C15TError;
	}
}
