import { resolveRequestBackendURL } from '@c15t/core/server';

import { trimTrailingSlashes } from './path';

/**
 * Resolves a relative or absolute backend URL against the incoming request.
 *
 * By default the origin comes from `request.url` only: the host and
 * protocol the server itself resolved the request under. `x-forwarded-*`
 * headers are client-controlled unless a trusted proxy strips them, and a
 * relative `backendURL` resolved against them would let a visitor point the
 * server's own manifest fetch, or the proxied consent save, at any origin.
 * Pass `trustForwardedHeaders: true` only when the app runs behind a proxy
 * that sets those headers and drops incoming ones.
 *
 * @param url - The configured backend or manifest URL.
 * @param request - The incoming request.
 * @param trustForwardedHeaders - Honour `forwarded` and `x-forwarded-*`
 * from the request.
 * @returns The absolute URL, or `null` when it cannot be resolved.
 */
export const resolveRequestURL = function resolveRequestURL(
	url: string,
	request: Request,
	trustForwardedHeaders = false
): string | null {
	return resolveRequestBackendURL(url, {
		headers: request.headers,
		requestURL: request.url,
		trustForwardedHeaders,
	});
};

/** `true` when `url` targets the request's own origin under `pathPrefix`. */
export const isSelfRoute = function isSelfRoute(
	url: string,
	request: Request,
	pathPrefix: string
): boolean {
	try {
		const target = new URL(url);
		const origin = new URL(request.url);
		const prefix = trimTrailingSlashes(pathPrefix);
		return (
			target.origin === origin.origin &&
			(target.pathname === prefix || target.pathname.startsWith(`${prefix}/`))
		);
	} catch {
		return false;
	}
};
