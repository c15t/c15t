/**
 * Astro middleware entrypoint for `@c15t/astro`.
 *
 * The integration registers this with `order: 'pre'` so every route — pages,
 * endpoints and server islands alike — sees `Astro.locals.c15t` already
 * populated. See {@link createConsentMiddleware} for what it does.
 */

import type { MiddlewareHandler } from 'astro';
import options from 'virtual:c15t/options';

import { createConsentMiddleware } from './middleware-handler';
import type { ConsentMiddlewareOptions } from './middleware-handler';
import type { C15tLocals } from './types';

declare global {
	// oxlint-disable-next-line typescript/no-namespace -- Astro's documented `App.Locals` augmentation point is a namespace.
	namespace App {
		interface Locals {
			/** Consent context resolved by the c15t middleware. */
			c15t: C15tLocals;
		}
	}
}

export const onRequest = createConsentMiddleware(options);
export default onRequest;

/**
 * The consent middleware bound to this site's `c15t()` options, for a
 * `src/middleware.ts` that composes it itself. Set `middleware: false` in
 * the integration so it does not also run as the `pre` middleware.
 *
 * @param middlewareOptions - Per-request hooks such as `experimentVariant`.
 * @returns The middleware handler.
 * @example
 * ```ts
 * // src/middleware.ts
 * import { consentMiddleware } from '@c15t/astro/middleware';
 *
 * export const onRequest = consentMiddleware({
 *   experimentVariant: (context) =>
 *     context.cookies.get('banner-arm')?.value === 'wall' ? 'wall' : 'floating',
 * });
 * ```
 */
export const consentMiddleware = function consentMiddleware(
	middlewareOptions: ConsentMiddlewareOptions = {}
): MiddlewareHandler {
	return createConsentMiddleware(options, middlewareOptions);
};

export { createConsentMiddleware } from './middleware-handler';
export type { ConsentMiddlewareOptions } from './middleware-handler';
