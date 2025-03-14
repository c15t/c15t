/**
 * C15T Middleware Exports
 *
 * This barrel file exports all middlewares used by the C15T consent management system.
 * Middlewares handle cross-cutting concerns like security, validation, and context
 * enrichment for API endpoints.
 *
 * @module middlewares
 *
 * @remarks
 * The middlewares in this directory implement various security and validation
 * requirements for the consent management API. They can be applied globally to
 * all routes or selectively to specific endpoint groups.
 *
 * Currently included middlewares:
 * - Origin check middleware: Validates URLs against trusted origins to prevent CSRF
 *   and open redirect vulnerabilities
 *
 * @example
 * ```typescript
 * // Import all middlewares
 * import { originCheckMiddleware, originCheck } from '~/api/middlewares';
 *
 * // Apply middleware to a router
 * const router = createRouter(endpoints, {
 *   routerMiddleware: [
 *     {
 *       path: '/**',
 *       middleware: originCheckMiddleware
 *     }
 *   ]
 * });
 *
 * // Create a targeted middleware for a specific field
 * const validateReturnUrl = originCheck(ctx => ctx.body?.returnUrl);
 * ```
 */
export * from './origin-check';
