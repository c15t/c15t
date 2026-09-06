/**
 * Astro middleware entrypoint for `@c15t/astro`.
 *
 * The integration registers this with `order: 'pre'` so every route — pages,
 * endpoints and server islands alike — sees `Astro.locals.c15t` already
 * populated. See {@link createConsentMiddleware} for what it does.
 */

import options from 'virtual:c15t/options';

import { createConsentMiddleware } from './middleware-handler';
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

export { createConsentMiddleware } from './middleware-handler';
export type { ConsentMiddlewareOptions } from './middleware-handler';
