/**
 * The shipped consent middleware, scoped to page routes.
 *
 * `c15t()` normally registers `@c15t/astro/middleware` for every route. That
 * is right for a real deployment, where the manifest lives on a CDN or a
 * backend host. Here the manifest is served by this same process, so a
 * blanket middleware makes the manifest request resolve consent, which
 * fetches the manifest, which resolves consent — the first request never
 * returns and nothing populates the cache that would break the cycle.
 *
 * Skipping `/api/` is what an app would do anyway (endpoints do not render
 * consent UI), and page routes still go through the shipped middleware
 * unchanged, so the measured path is the real one.
 *
 * `options` is `null` in the zero-consent `baseline` build, where the
 * integration — and therefore the real virtual module — is absent.
 */
import { createConsentMiddleware } from '@c15t/astro';
import type { MiddlewareHandler } from 'astro';
import options from 'virtual:c15t/options';

const consentMiddleware = options ? createConsentMiddleware(options) : null;

export const onRequest: MiddlewareHandler = (context, next) =>
	!consentMiddleware || context.url.pathname.startsWith('/api/')
		? next()
		: consentMiddleware(context, next);
