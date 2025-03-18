import { createApiRouter } from '~/pkgs/api-router';
import type { C15TContext, C15TOptions } from '~/types';
import { originCheckMiddleware } from './middlewares/origin-check';
import { validateContextMiddleware } from './middlewares/validate-context';
import { baseEndpoints } from './routes';
import { ok } from './routes/ok';

/**
 * Creates a router for handling API requests
 *
 * Sets up routing with proper error handling, CORS, and response processing.
 * Integrates plugin-provided middlewares and response handlers.
 *
 * @remarks
 * This router automatically applies the origin check middleware to all routes
 * and handles error conditions appropriately based on configuration.
 *
 * @typeParam ContextType - The specific context type extending C15TContext
 * @typeParam OptionsType - Configuration options type extending C15TOptions
 * @param ctx - The initialized consent management context
 * @param options - Configuration options for the consent system
 * @returns A configured router with handler and endpoint functions
 * @throws May throw errors in the onError handler if options.onAPIError.throw is true
 *
 * @example
 * ```typescript
 * const consentRouter = router(contextInstance, {
 *   logger: { level: 'error' },
 *   plugins: [analyticsPlugin()]
 * });
 *
 * // Use the router to handle incoming requests
 * app.use('/api/consent', async (req, res) => {
 *   const response = await consentRouter.handler(
 *     new Request(`https://example.com${req.url}`, {
 *       method: req.method,
 *       headers: req.headers,
 *       body: req.body ? JSON.stringify(req.body) : undefined
 *     })
 *   );
 *
 *   // Send the response back
 *   res.status(response.status);
 *   response.headers.forEach((value, key) => {
 *     res.setHeader(key, value);
 *   });
 *   const body = await response.text();
 *   res.send(body);
 * });
 * ```
 */
export const router = <
	ContextType extends C15TContext,
	OptionsType extends C15TOptions,
>(
	ctx: ContextType,
	options: OptionsType
) => {
	const coreMiddlewares = [
		{
			path: '/**',
			middleware: validateContextMiddleware,
		},
		{
			path: '/**',
			middleware: originCheckMiddleware,
		},
	];

	return createApiRouter(ctx, options, baseEndpoints, ok, coreMiddlewares);
};
