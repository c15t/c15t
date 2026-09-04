import { resolveBackendURL } from '@c15t/schema/types';

/**
 * Headers `resolveBackendURL` needs to turn a relative backend URL into an
 * absolute one. Reads the proxy headers Node, Cloudflare Workers, Vercel,
 * and Netlify populate, and falls back to the request URL's host and
 * protocol, which are always present on a fetch `Request`.
 *
 * The protocol fallback matters for local development: without it a
 * relative `backendURL` resolves to `https://localhost:3000/...` against a
 * plain-HTTP dev server and every manifest fetch fails with a TLS error. A
 * real `x-forwarded-proto` header from a TLS-terminating proxy still wins.
 */
export const getRequestResolutionHeaders = function getRequestResolutionHeaders(
	request: Request
): Record<string, string> {
	const headers: Record<string, string> = {};
	try {
		const url = new URL(request.url);
		headers.host = url.host;
		headers['x-forwarded-proto'] = url.protocol.replace(/:$/u, '');
	} catch {
		// Relative request URLs (some test doubles) carry no host.
	}
	for (const name of [
		'x-forwarded-proto',
		'x-forwarded-ssl',
		'x-forwarded-host',
		'host',
		'referer',
	]) {
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
 * @returns The absolute URL, or `null` when it cannot be resolved.
 */
export const resolveRequestURL = function resolveRequestURL(
	url: string,
	request: Request
): string | null {
	return resolveBackendURL(url, getRequestResolutionHeaders(request));
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
		return (
			target.origin === origin.origin && target.pathname.startsWith(pathPrefix)
		);
	} catch {
		return false;
	}
};
