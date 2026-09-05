import { resolveBackendURL } from '@c15t/schema/types';

const FORWARDED_HEADER_NAMES = [
	'x-forwarded-proto',
	'x-forwarded-ssl',
	'x-forwarded-host',
	'host',
	'referer',
] as const;

/**
 * Headers `resolveBackendURL` needs to turn a relative backend URL into an
 * absolute one.
 *
 * By default the authority comes from `request.url` only: the host and
 * protocol the server itself resolved the request under. `x-forwarded-*`
 * headers are client-controlled unless a trusted proxy strips them, and a
 * relative `backendURL` resolved against them would let a visitor point the
 * server's own manifest fetch, or the proxied consent save, at any origin.
 * Pass `trustForwardedHeaders: true` only when the app runs behind a proxy
 * that sets those headers and drops incoming ones.
 */
export const getRequestResolutionHeaders = function getRequestResolutionHeaders(
	request: Request,
	trustForwardedHeaders = false
): Record<string, string> {
	const headers: Record<string, string> = {};
	try {
		const url = new URL(request.url);
		headers.host = url.host;
		headers['x-forwarded-proto'] = url.protocol.replace(/:$/u, '');
	} catch {
		// Relative request URLs (some test doubles) carry no host.
	}
	if (!trustForwardedHeaders) {
		return headers;
	}
	for (const name of FORWARDED_HEADER_NAMES) {
		const value = request.headers.get(name);
		if (value) {
			headers[name] = value;
		}
	}
	return headers;
};

/**
 * Resolves a relative or absolute backend URL against the incoming request.
 *
 * @param url - The configured backend or manifest URL.
 * @param request - The incoming request.
 * @param trustForwardedHeaders - Honour `x-forwarded-*` from the request.
 * @returns The absolute URL, or `null` when it cannot be resolved.
 */
export const resolveRequestURL = function resolveRequestURL(
	url: string,
	request: Request,
	trustForwardedHeaders = false
): string | null {
	return resolveBackendURL(
		url,
		getRequestResolutionHeaders(request, trustForwardedHeaders)
	);
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
		const prefix = pathPrefix.replace(/\/+$/u, '');
		return (
			target.origin === origin.origin &&
			(target.pathname === prefix || target.pathname.startsWith(`${prefix}/`))
		);
	} catch {
		return false;
	}
};
