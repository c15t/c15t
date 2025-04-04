import { eventHandler, sendError } from 'h3';
import type { H3Event } from 'h3';
import { DoubleTieError } from './core/error-class';
import { ERROR_CODES } from './core/error-codes';
import type { ErrorMessageType } from './types';

// Extend the H3 context type to include our custom _onError property
declare module 'h3' {
	interface H3EventContext {
		_onError?: (error: unknown) => unknown;
	}
}

/**
 * Creates an H3 error handler middleware that properly handles DoubleTieError instances
 *
 * This utility ensures consistent error handling across your H3.js application and
 * properly converts DoubleTieError objects to H3-compatible error responses.
 *
 * @returns An H3 event handler middleware for error handling
 *
 * @example
 * ```typescript
 * import { createH3ErrorHandler } from '@doubletie/results';
 * import { createApp } from 'h3';
 *
 * const app = createApp();
 *
 * // Register the error handler middleware
 * app.use(createH3ErrorHandler());
 *
 * // Your routes...
 * ```
 */
export function createH3ErrorHandler() {
	return eventHandler((event) => {
		// Attach our error handler to the event context
		event.context._onError = (error: unknown) => {
			event.context.logger.error('Error in H3 error handler', { error });
			// Handle DoubleTieError instances
			if (error instanceof DoubleTieError) {
				event.context.logger.error(
					'Handling DoubleTieError:',
					error.statusCode,
					error.message
				);
				// DoubleTieError is already an H3Error, so we can send it directly
				return sendError(event, error);
			}

			// For other errors, create a new DoubleTieError
			event.context.logger.error('Handling generic error', { error });
			const dtError = new DoubleTieError(
				error instanceof Error ? error.message : String(error),
				{
					code: ERROR_CODES.INTERNAL_SERVER_ERROR,
					status: 500,
					cause: error instanceof Error ? error : undefined,
				}
			);

			return sendError(event, dtError);
		};

		// We need to call event.node.req.on('error') to handle connection errors
		event.node.req.on('error', (err) => {
			event.context.logger.error('Request error event triggered:', { err });
			if (event.context._onError) {
				event.context._onError(err);
			}
		});

		// Continue with request processing
		return;
	});
}

/**
 * Wraps an H3 event handler with error handling for DoubleTieError
 *
 * @param handler - The event handler to wrap
 * @returns A wrapped handler that automatically handles DoubleTieError instances
 *
 * @example
 * ```typescript
 * import { withH3ErrorHandling } from '@doubletie/results';
 * import { eventHandler } from 'h3';
 *
 * app.use('/api/users', withH3ErrorHandling(
 *   eventHandler(async (event) => {
 *     // Your handler code that might throw DoubleTieError
 *     throw new DoubleTieError('User not found', {
 *       code: ERROR_CODES.NOT_FOUND,
 *       status: 404
 *     });
 *   })
 * ));
 * ```
 */
export function withH3ErrorHandling(
	handler: (event: H3Event) => Promise<unknown> | unknown
) {
	return eventHandler(async (event) => {
		try {
			return await handler(event);
		} catch (error) {
			event.context.logger.error('Error caught in withH3ErrorHandling:', { error });

			// Handle DoubleTieError instances
			if (error instanceof DoubleTieError) {
				event.context.logger.error(
					'Handling DoubleTieError in wrapper:',
					error.statusCode,
					error.message
				);
				// DoubleTieError is already an H3Error, so we can send it directly
				return sendError(event, error);
			}

			// Use the context error handler if available
			if (
				event.context._onError &&
				typeof event.context._onError === 'function'
			) {
				return event.context._onError(error);
			}

			// Create and send a new DoubleTieError
			const dtError = new DoubleTieError(
				error instanceof Error ? error.message : String(error),
				{
					code: ERROR_CODES.INTERNAL_SERVER_ERROR,
					status: 500,
					cause: error instanceof Error ? error : undefined,
				}
			);

			return sendError(event, dtError);
		}
	});
}

/**
 * Creates a new DoubleTieError from an H3 request context
 *
 * @param message - The error message
 * @param code - The error code
 * @param status - The HTTP status code
 * @param event - The H3 event
 * @param meta - Additional metadata to include
 * @returns A new DoubleTieError with request context info
 *
 * @example
 * ```typescript
 * app.use('/api/users/:id', eventHandler(async (event) => {
 *   const userId = event.context.params.id;
 *
 *   const user = await getUserById(userId);
 *   if (!user) {
 *     throw createRequestError(
 *       'User not found',
 *       ERROR_CODES.NOT_FOUND,
 *       404,
 *       event,
 *       { userId }
 *     );
 *   }
 *
 *   return user;
 * }));
 * ```
 */
export function createRequestError(
	message: string,
	code: ErrorMessageType,
	status: number,
	event: H3Event,
	meta: Record<string, unknown> = {}
) {
	// Extract useful request information
	const requestInfo = {
		method: event.method,
		path: event.path,
		params: event.context.params,
		query: event.context.query,
		...meta,
	};

	return new DoubleTieError(message, {
		code,
		status,
		meta: requestInfo,
	});
}
