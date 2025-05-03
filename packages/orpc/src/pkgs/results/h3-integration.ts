import { ORPCError } from '@orpc/server';
import { DoubleTieError } from './core/error-class';
import { ERROR_CODES } from './core/error-codes';

/**
 * Creates an oRPC error handler middleware that properly handles DoubleTieError instances
 *
 * This utility ensures consistent error handling across your oRPC application and
 * properly converts DoubleTieError objects to oRPC-compatible error responses.
 *
 * @returns An oRPC request handler middleware for error handling
 *
 * @example
 * ```typescript
 * import { createORPCErrorHandler } from '@doubletie/results';
 * import { RPCHandler } from '@orpc/server';
 *
 * const handler = new RPCHandler(router);
 *
 * // Register the error handler middleware
 * handler.use(createORPCErrorHandler());
 *
 * // Your routes...
 * ```
 */
export function createORPCErrorHandler() {
	return (
		request: Request,
		context: { logger?: { error: (message: string, data?: object) => void } }
	) => {
		// Add error handler to context
		return {
			context: {
				_onError: (error: unknown) => {
					context.logger?.error('Error in oRPC error handler', { error });

					// Handle DoubleTieError instances
					if (error instanceof DoubleTieError) {
						context.logger?.error('Handling DoubleTieError', {
							code: error.code,
							message: error.message,
						});

						// Convert DoubleTieError to ORPCError
						throw new ORPCError(error.code, {
							message: error.message,
							cause: error.cause instanceof Error ? error.cause : undefined,
							data: error.meta,
						});
					}

					// For other errors, create a new ORPCError
					context.logger?.error('Handling generic error', { error });
					throw new ORPCError(ERROR_CODES.INTERNAL_SERVER_ERROR, {
						message: error instanceof Error ? error.message : String(error),
						cause: error instanceof Error ? error : undefined,
					});
				},
			},
		};
	};
}

/**
 * Wraps an oRPC handler with error handling for DoubleTieError
 *
 * @param handler - The handler function to wrap
 * @returns A wrapped handler that automatically handles DoubleTieError instances
 *
 * @example
 * ```typescript
 * import { withORPCErrorHandling } from '@doubletie/results';
 * import { os } from '@orpc/server';
 *
 * const getUserHandler = os.handler(async ({ input }) => {
 *   // Your handler code that might throw DoubleTieError
 *   throw new DoubleTieError('User not found', {
 *     code: ERROR_CODES.NOT_FOUND,
 *     status: 404
 *   });
 * });
 *
 * // Wrap the handler with error handling
 * const safeGetUserHandler = withORPCErrorHandling(getUserHandler);
 * ```
 */
export function withORPCErrorHandling<TInput, TOutput>(
	handler: (
		input: TInput,
		context: {
			logger?: { error: (message: string, data?: object) => void };
			_onError?: (error: unknown) => unknown;
		}
	) => Promise<TOutput> | TOutput
) {
	return async (
		input: TInput,
		context: {
			logger?: { error: (message: string, data?: object) => void };
			_onError?: (error: unknown) => unknown;
		}
	) => {
		try {
			return await handler(input, context);
		} catch (error) {
			context.logger?.error('Error caught in withORPCErrorHandling', {
				error,
			});

			// Handle DoubleTieError instances
			if (error instanceof DoubleTieError) {
				context.logger?.error('Handling DoubleTieError in wrapper', {
					code: error.code,
					message: error.message,
				});

				// Convert DoubleTieError to ORPCError
				throw new ORPCError(error.code, {
					message: error.message,
					cause: error.cause instanceof Error ? error.cause : undefined,
					data: error.meta,
				});
			}

			// Use the context error handler if available
			if (context._onError && typeof context._onError === 'function') {
				return context._onError(error);
			}

			// Create and throw a new ORPCError
			throw new ORPCError(ERROR_CODES.INTERNAL_SERVER_ERROR, {
				message: error instanceof Error ? error.message : String(error),
				cause: error instanceof Error ? error : undefined,
			});
		}
	};
}
