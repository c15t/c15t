/**
 * C15TError - Custom error class for typed error handling
 *
 * @example
 * ```typescript
 * import { C15TError } from '@c15t/node-sdk';
 *
 * try {
 *   const subject = (await client.getSubject('sub_123')).unwrap();
 * } catch (error) {
 *   if (error instanceof C15TError) {
 *     console.log(error.status); // 404
 *     console.log(error.code);   // 'NOT_FOUND'
 *     console.log(error.details);
 *   }
 * }
 * ```
 */
export class C15TError extends Error {
	/**
	 * HTTP status code of the error response
	 */
	readonly status: number;

	/**
	 * Error code for programmatic error identification
	 */
	readonly code?: string;

	/**
	 * Additional error details
	 */
	readonly details?: Record<string, unknown> | null;

	/**
	 * Original cause of the error (if any)
	 */
	readonly cause?: unknown;

	constructor(options: {
		message: string;
		status: number;
		code?: string;
		details?: Record<string, unknown> | null;
		cause?: unknown;
	}) {
		super(options.message);
		this.name = 'C15TError';
		this.status = options.status;
		this.code = options.code;
		this.details = options.details;
		this.cause = options.cause;

		// Maintains proper stack trace for where our error was thrown (V8 engines)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, C15TError);
		}
	}

	/**
	 * Check if the error is a specific HTTP status code
	 */
	isStatus(status: number): boolean {
		return this.status === status;
	}

	/**
	 * Check if the error is a not found error (404)
	 */
	isNotFound(): boolean {
		return this.status === 404 || this.code === 'NOT_FOUND';
	}

	/**
	 * Check if the error is a validation error (400)
	 */
	isValidationError(): boolean {
		return this.status === 400 || this.code === 'VALIDATION_ERROR';
	}

	/**
	 * Check if the error is an authentication error (401)
	 */
	isUnauthorized(): boolean {
		return this.status === 401 || this.code === 'UNAUTHORIZED';
	}

	/**
	 * Check if the error is a forbidden error (403)
	 */
	isForbidden(): boolean {
		return this.status === 403 || this.code === 'FORBIDDEN';
	}

	/**
	 * Check if the error is a server error (5xx)
	 */
	isServerError(): boolean {
		return this.status >= 500 && this.status < 600;
	}

	/**
	 * Check if the error is a network error
	 */
	isNetworkError(): boolean {
		return this.status === 0 || this.code === 'NETWORK_ERROR';
	}

	/**
	 * Convert error to a plain object for serialization
	 */
	toJSON(): {
		name: string;
		message: string;
		status: number;
		code?: string;
		details?: Record<string, unknown> | null;
	} {
		return {
			name: this.name,
			message: this.message,
			status: this.status,
			code: this.code,
			details: this.details,
		};
	}
}

/**
 * Type guard to check if an error is a C15TError
 */
export function isC15TError(error: unknown): error is C15TError {
	return error instanceof C15TError;
}
