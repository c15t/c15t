/**
 * Resolves a relative backend URL (`/api/c15t`) to an absolute one on the
 * server, without letting the visitor choose the host.
 *
 * `x-forwarded-host`, `x-forwarded-proto`, `x-forwarded-ssl` and `forwarded`
 * are plain request headers: any client can send them, and they only mean
 * something when a proxy the app trusts sets them and drops incoming ones.
 * Server adapters forward the visitor's cookies to the resolved backend, so
 * resolving against those headers by default would let a request point the
 * server's own fetch, cookies included, at a host of the sender's choosing.
 */

/** Request headers as a Web `Headers` object or a Node header record. */
export type RequestHeaderSource =
	| Headers
	| Record<string, string | string[] | undefined>;

/** Options for {@link resolveRequestOrigin} and {@link resolveRequestBackendURL}. */
export interface ResolveRequestOriginOptions {
	/**
	 * The URL the framework resolved the request under: SvelteKit
	 * `event.url`, a route handler's `request.url`, Astro `Astro.url`, Nitro
	 * `getRequestURL(event)`. Frameworks derive it from their own trusted
	 * configuration, so it decides the origin whenever it is available.
	 */
	requestURL?: string | URL;

	/**
	 * The incoming request headers. Without a `requestURL`, the origin comes
	 * from `host`: over `https` for a domain name, and over `http` for
	 * `localhost`, an IP address, or a single-label host such as `app:3000`.
	 * Forwarding headers are read only when `trustForwardedHeaders` is set.
	 */
	headers?: RequestHeaderSource;

	/**
	 * Resolve against `forwarded`, `x-forwarded-host`, `x-forwarded-proto`
	 * and `x-forwarded-ssl` from the request. Set this only when the app runs
	 * behind a proxy that sets those headers and drops any the client sent;
	 * otherwise a client can choose the host the server sends requests, and
	 * the visitor's cookies, to.
	 *
	 * @defaultValue false
	 */
	trustForwardedHeaders?: boolean;
}

const ABSOLUTE_HTTP_URL = /^https?:\/\//iu;
const UNSAFE_HOST_CHARACTER = /[\s/\\?#@]/u;
const IPV4_LITERAL = /^\d{1,3}(?:\.\d{1,3}){3}$/u;

const readHeader = function readHeader(
	headers: RequestHeaderSource | undefined,
	name: string
): string | undefined {
	if (!headers) {
		return undefined;
	}
	if (typeof (headers as Headers).get === 'function') {
		return (headers as Headers).get(name) ?? undefined;
	}
	const value = (headers as Record<string, string | string[] | undefined>)[
		name
	];
	return Array.isArray(value) ? value[0] : value;
};

/** First entry of a comma-separated proxy chain, trimmed. */
const firstListValue = function firstListValue(
	value: string | undefined
): string | undefined {
	const first = value?.split(',')[0]?.trim();
	return first || undefined;
};

const normalizeProtocol = function normalizeProtocol(
	value: string | undefined
): 'http' | 'https' | undefined {
	const protocol = value?.trim().toLowerCase().replace(/:$/u, '');
	return protocol === 'http' || protocol === 'https' ? protocol : undefined;
};

/** Reads `host=` and `proto=` from the first element of an RFC 7239 header. */
const parseForwardedHeader = function parseForwardedHeader(
	value: string | undefined
): { host?: string; protocol?: 'http' | 'https' } {
	const first = firstListValue(value);
	if (!first) {
		return {};
	}
	const result: { host?: string; protocol?: 'http' | 'https' } = {};
	for (const pair of first.split(';')) {
		const separator = pair.indexOf('=');
		if (separator === -1) {
			continue;
		}
		const key = pair.slice(0, separator).trim().toLowerCase();
		const token = pair.slice(separator + 1).trim();
		const raw =
			token.length >= 2 && token.startsWith('"') && token.endsWith('"')
				? token.slice(1, -1)
				: token;
		if (key === 'host' && raw) {
			result.host = raw;
		} else if (key === 'proto') {
			result.protocol = normalizeProtocol(raw);
		}
	}
	return result;
};

/**
 * The scheme to assume for a bare `host` with no request URL to read it
 * from: `http` for loopback, IP-literal and single-label hosts (`localhost`,
 * `127.0.0.1`, `app:3000` inside a container network), which rarely serve
 * TLS, and `https` for domain names.
 */
const defaultProtocolForHost = function defaultProtocolForHost(
	host: string
): 'http' | 'https' {
	let hostname: string;
	try {
		hostname = new URL(`http://${host}`).hostname.toLowerCase();
	} catch {
		return 'https';
	}
	const isPlainHTTP =
		hostname === 'localhost' ||
		hostname.endsWith('.localhost') ||
		hostname.startsWith('[') ||
		IPV4_LITERAL.test(hostname) ||
		!hostname.includes('.');
	return isPlainHTTP ? 'http' : 'https';
};

/** `protocol://host` as an origin, or `null` when `host` is not a bare authority. */
const toOrigin = function toOrigin(
	protocol: 'http' | 'https',
	host: string
): string | null {
	if (!host || UNSAFE_HOST_CHARACTER.test(host)) {
		return null;
	}
	try {
		const url = new URL(`${protocol}://${host}`);
		return url.pathname === '/' && !url.username && !url.password
			? url.origin
			: null;
	} catch {
		return null;
	}
};

/**
 * The origin under trusted forwarding headers. The host and the scheme are
 * read separately, so a proxy that keeps the incoming `host` and only sets
 * `x-forwarded-proto` still decides the scheme.
 *
 * Host: `forwarded: host=`, `x-forwarded-host`, the request URL's host, then
 * `host`. Scheme: `forwarded: proto=`, `x-forwarded-proto`,
 * `x-forwarded-ssl: on`, the request URL's scheme, then the default for the
 * host.
 */
const originFromForwardedHeaders = function originFromForwardedHeaders(
	headers: RequestHeaderSource | undefined,
	requestOrigin: URL | null
): string | null {
	const forwarded = parseForwardedHeader(readHeader(headers, 'forwarded'));
	const host =
		forwarded.host ??
		firstListValue(readHeader(headers, 'x-forwarded-host')) ??
		requestOrigin?.host ??
		readHeader(headers, 'host')?.trim();
	if (!host) {
		return null;
	}
	const protocol =
		forwarded.protocol ??
		normalizeProtocol(
			firstListValue(readHeader(headers, 'x-forwarded-proto'))
		) ??
		(readHeader(headers, 'x-forwarded-ssl') === 'on' ? 'https' : undefined) ??
		normalizeProtocol(requestOrigin?.protocol) ??
		defaultProtocolForHost(host);
	return toOrigin(protocol, host);
};

const originFromRequestURL = function originFromRequestURL(
	requestURL: string | URL | undefined
): string | null {
	if (!requestURL) {
		return null;
	}
	try {
		const url = new URL(requestURL);
		const protocol = normalizeProtocol(url.protocol);
		return protocol ? toOrigin(protocol, url.host) : null;
	} catch {
		return null;
	}
};

/**
 * The origin a relative backend URL resolves against for this request.
 *
 * Without `trustForwardedHeaders`: the framework's `requestURL`, then the
 * `host` header (`https` for a domain name; `http` for `localhost`, an IP
 * address or a single-label host). With it, a forwarded host and a forwarded
 * scheme each override that result on their own, so either header can be
 * set without the other. Client-supplied forwarding headers are never read
 * unless the app opts in.
 *
 * @param options - The request URL, headers, and forwarding trust.
 * @returns An origin such as `https://app.example.com`, or `null` when the
 * request carries none.
 * @example
 * ```ts
 * resolveRequestOrigin({ requestURL: event.url });
 * // 'http://localhost:5173'
 * ```
 */
export const resolveRequestOrigin = function resolveRequestOrigin(
	options: ResolveRequestOriginOptions
): string | null {
	const fromURL = originFromRequestURL(options.requestURL);
	if (options.trustForwardedHeaders) {
		const forwarded = originFromForwardedHeaders(
			options.headers,
			fromURL ? new URL(fromURL) : null
		);
		if (forwarded) {
			return forwarded;
		}
	}
	if (fromURL) {
		return fromURL;
	}
	const host = readHeader(options.headers, 'host')?.trim();
	if (!host) {
		return null;
	}
	return toOrigin(defaultProtocolForHost(host), host);
};

const trimTrailingSlash = function trimTrailingSlash(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
};

/**
 * Resolves a configured backend or manifest URL for a server-side request.
 *
 * Absolute `http(s)` URLs are returned normalized, without a trailing
 * slash. A `/`-relative URL is joined to {@link resolveRequestOrigin}, and
 * the result must stay on that origin, so `//other.example/x` is rejected.
 * Anything else returns `null`; the helper never throws.
 *
 * @param backendURL - The configured URL, absolute or `/`-relative.
 * @param options - The request URL, headers, and forwarding trust.
 * @returns The absolute URL, or `null` when it cannot be resolved.
 * @example
 * ```ts
 * import { resolveRequestBackendURL } from '@c15t/core/server';
 *
 * resolveRequestBackendURL('/api/c15t', { requestURL: request.url });
 * // 'https://app.example.com/api/c15t'
 * ```
 */
export const resolveRequestBackendURL = function resolveRequestBackendURL(
	backendURL: string,
	options: ResolveRequestOriginOptions = {}
): string | null {
	try {
		if (ABSOLUTE_HTTP_URL.test(backendURL)) {
			return trimTrailingSlash(new URL(backendURL).toString());
		}
		if (!backendURL.startsWith('/') || backendURL.startsWith('//')) {
			return null;
		}
		const origin = resolveRequestOrigin(options);
		if (!origin) {
			return null;
		}
		const resolved = new URL(`${origin}${backendURL}`);
		if (resolved.origin !== origin) {
			return null;
		}
		return trimTrailingSlash(resolved.toString());
	} catch {
		return null;
	}
};
