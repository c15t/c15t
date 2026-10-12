/**
 * Same-origin consent proxy shared by the server adapters.
 *
 * Lets an app point its consent client at its own origin (`/api/c15t`):
 * the browser talks to the app, the app forwards to the c15t backend. Only
 * the paths the client transport calls (`subjects`, `subjects/:id`, `init`,
 * `manifest`, `health`, `status`) plus explicitly allowlisted extras are
 * forwarded; everything else is a 404, so a route built on this is never an
 * open proxy.
 *
 * Why the header shaping matters: the hosted backend sits behind Vercel
 * Firewall or Cloudflare. A bare server-to-server fetch carries a server TLS
 * fingerprint, no user agent, and one egress IP for every visitor, which
 * scores as a bot. Forwarding the browser's identity headers and the real
 * client IP gives the WAF the same signals a direct request would carry, and
 * `x-c15t-proxy` plus the version headers give the platform a stable key for
 * a firewall bypass rule.
 *
 * Each adapter decides where the forwarding values come from (a trusted
 * `x-forwarded-for` chain, a framework's client address API) and passes
 * them in as {@link ConsentProxyForwarding}.
 */

import { CONSENT_REQUEST_HEADER_NAMES } from '@c15t/schema/types';

import { c15tVersionHeaders } from '../transports/version-header';

/** Paths the proxy forwards when no extra `paths` are configured. */
export const CONSENT_PROXY_DEFAULT_PATHS: readonly string[] = [
	'subjects',
	'subjects/*',
	'init',
	'manifest',
	'health',
	'status',
];

/**
 * Browser headers forwarded upstream. Everything else the browser sent is
 * dropped: `host`, `content-length`, and the hop-by-hop set are wrong for
 * the upstream connection, and unknown headers must not leak through a
 * same-origin route. `cookie` is listed but only forwarded when
 * `cookieNames` names the cookies to send.
 */
export const CONSENT_PROXY_DEFAULT_FORWARD_HEADERS: readonly string[] = [
	'accept',
	'accept-language',
	'content-type',
	'cookie',
	'if-none-match',
	'origin',
	'referer',
	'user-agent',
	'sec-gpc',
	...CONSENT_REQUEST_HEADER_NAMES,
];

/** Deadline applied to upstream requests when none is configured. */
export const CONSENT_PROXY_DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Headers that describe the hop chain. They are never copied from the
 * browser; {@link buildConsentProxyRequestHeaders} sets them from
 * {@link ConsentProxyForwarding}.
 */
export const CONSENT_PROXY_FORWARDING_HEADERS: ReadonlySet<string> = new Set([
	'forwarded',
	'x-forwarded-for',
	'x-forwarded-host',
	'x-forwarded-proto',
]);

/** Headers that carry credentials and must never cross a cleartext link. */
const CREDENTIAL_HEADERS: ReadonlySet<string> = new Set([
	'authorization',
	'cookie',
	'proxy-authorization',
]);

/** Browser headers the default allowlist forwards that carry no identity. */
export const CONSENT_PROXY_PUBLIC_FORWARD_HEADERS: ReadonlySet<string> =
	new Set(
		CONSENT_PROXY_DEFAULT_FORWARD_HEADERS.filter(
			(name) => !CREDENTIAL_HEADERS.has(name)
		)
	);

/** Headers the proxy itself sets on every upstream request. */
const PROXY_SET_HEADERS: ReadonlySet<string> = new Set([
	'x-c15t-proxy',
	'x-forwarded-for',
	'x-forwarded-host',
	'x-forwarded-proto',
	...Object.keys(c15tVersionHeaders),
]);

/**
 * Upstream response headers that never reach the browser. Hop-by-hop
 * headers describe the upstream connection, not this one, and so does any
 * header the upstream `Connection` value names; `content-encoding` and
 * `content-length` describe a body the runtime `fetch` already decoded;
 * `set-cookie` is re-added without its `Domain`.
 */
const STRIPPED_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
	'connection',
	'content-encoding',
	'content-length',
	'keep-alive',
	'set-cookie',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
]);

/** `access-control-*` is meaningless once the response is same-origin. */
const STRIPPED_RESPONSE_PREFIXES = ['access-control-', 'proxy-'];

const BODYLESS_METHODS: ReadonlySet<string> = new Set([
	'GET',
	'HEAD',
	'OPTIONS',
]);

const LOOPBACK_HOSTS: ReadonlySet<string> = new Set([
	'localhost',
	'127.0.0.1',
	'[::1]',
	'::1',
]);

const MAX_DECODE_PASSES = 3;

/** Options for an adapter's opt-in consent proxy (`proxy: { ... }`). */
export interface ConsentProxyOptions {
	/**
	 * Extra upstream paths to allow, relative to `backendURL`. Exact segments
	 * (`'export'`) or a trailing `*` for one wildcard segment
	 * (`'subjects/*'`). The defaults (`subjects`, `subjects/*`, `init`,
	 * `manifest`, `health`, `status`) are always allowed.
	 */
	paths?: readonly string[];

	/**
	 * Extra request headers to forward from the browser in addition to the
	 * default allowlist (`accept`, `accept-language`, `content-type`,
	 * `cookie`, `if-none-match`, `origin`, `referer`, `user-agent`,
	 * `sec-gpc`, and every consent request header). `forwarded` and
	 * `x-forwarded-*` are ignored: the proxy sets those itself.
	 */
	forwardHeaders?: readonly string[];

	/**
	 * Cookie names to forward upstream. No cookies are forwarded by default:
	 * the c15t backend does not read cookies, and the consent cookie is
	 * written and read in the browser, so nothing from your origin's cookie
	 * jar needs to leave. Set this only for a backend that expects one.
	 * Cookies are never sent to a remote `http:` backend.
	 */
	cookieNames?: readonly string[];

	/**
	 * Deadline for the upstream response, in milliseconds. Bounds how long a
	 * stalled backend can hold an app server connection. The signal covers
	 * the whole exchange, body included, so keep it above the time the
	 * largest consent payload needs.
	 *
	 * @default 10000
	 */
	timeoutMs?: number;
}

/** {@link ConsentProxyOptions} with the defaults applied. */
export interface ResolvedConsentProxyOptions {
	/** Allowed upstream paths, defaults included. */
	paths: readonly string[];
	/** Lowercase browser headers to forward, defaults included. */
	forwardHeaders: readonly string[];
	/** Cookie names to forward, if any. */
	cookieNames?: readonly string[];
	/** Upstream deadline in milliseconds; `0` disables it. */
	timeoutMs: number;
}

/**
 * The hop-chain values an adapter vouches for. Each adapter derives them
 * from what its framework can trust; the proxy never reads them from the
 * browser's own headers.
 */
export interface ConsentProxyForwarding {
	/** `x-forwarded-for` to send, or `undefined` to send none. */
	for?: string;
	/** `x-forwarded-host` to send. */
	host: string;
	/** `x-forwarded-proto` to send, without a trailing colon. */
	proto: string;
}

/** Removes trailing slashes in linear time. */
const trimTrailingSlashes = function trimTrailingSlashes(
	value: string
): string {
	let end = value.length;
	while (end > 0 && value[end - 1] === '/') {
		end -= 1;
	}
	return value.slice(0, end);
};

/** Removes surrounding slashes, preserving interior path segments. */
const trimPathSlashes = function trimPathSlashes(value: string): string {
	const trimmed = trimTrailingSlashes(value);
	let start = 0;
	while (start < trimmed.length && trimmed[start] === '/') {
		start += 1;
	}
	return trimmed.slice(start);
};

/**
 * Normalizes an adapter's `proxy: boolean | ConsentProxyOptions` option.
 *
 * @param proxy - The adapter's `proxy` option.
 * @returns The resolved options, or `undefined` when the proxy is off.
 * @example
 * ```ts
 * const options = resolveConsentProxyOptions({ cookieNames: ['tenant'] });
 * ```
 */
export const resolveConsentProxyOptions = function resolveConsentProxyOptions(
	proxy: boolean | ConsentProxyOptions | undefined
): ResolvedConsentProxyOptions | undefined {
	if (!proxy) {
		return undefined;
	}
	const options = proxy === true ? {} : proxy;
	return {
		cookieNames: options.cookieNames,
		forwardHeaders: [
			...CONSENT_PROXY_DEFAULT_FORWARD_HEADERS,
			...(options.forwardHeaders ?? []).map((name) => name.toLowerCase()),
		],
		paths: [...CONSENT_PROXY_DEFAULT_PATHS, ...(options.paths ?? [])],
		timeoutMs: options.timeoutMs ?? CONSENT_PROXY_DEFAULT_TIMEOUT_MS,
	};
};

const matchesPattern = function matchesPattern(
	pattern: string,
	segments: readonly string[]
): boolean {
	const expected = trimPathSlashes(pattern).split('/');
	if (expected.length !== segments.length) {
		return false;
	}
	return expected.every(
		(segment, index) => segment === '*' || segment === segments[index]
	);
};

const decodeSegment = function decodeSegment(segment: string): string | null {
	try {
		return decodeURIComponent(segment);
	} catch {
		return null;
	}
};

/**
 * `true` when a path segment could change the target once something
 * downstream decodes and normalizes it: empty, dot segments, or an encoded
 * separator. Decoding repeats until the value is stable (bounded), so a
 * doubly encoded `%252e%252e` is caught as well as `%2e%2e`. The proxy
 * itself decodes once; the extra passes are defence in depth against an
 * upstream that decodes again before normalizing.
 */
const isUnsafeSegment = function isUnsafeSegment(segment: string): boolean {
	let current = segment;
	for (let pass = 0; pass < MAX_DECODE_PASSES; pass += 1) {
		const decoded = decodeSegment(current);
		if (
			decoded === null ||
			decoded === '' ||
			decoded === '.' ||
			decoded === '..' ||
			decoded.includes('/') ||
			decoded.includes('\\')
		) {
			return true;
		}
		if (decoded === current) {
			return false;
		}
		current = decoded;
	}
	// Still changing after the bounded passes: refuse rather than guess.
	return true;
};

/**
 * Whether `path` may go through the proxy. Each allowlist entry is matched
 * segment by segment; `*` matches exactly one non-empty segment. Segments
 * are percent-decoded before the check, so `%2e%2e` and an encoded slash
 * are rejected the same as a literal `..`.
 *
 * @param path - Path below the route prefix, for example `subjects/sub_1`.
 * @param allowed - Allowlist patterns.
 * @returns `true` when the path is allowed.
 */
export const isConsentProxyPathAllowed = function isConsentProxyPathAllowed(
	path: string,
	allowed: readonly string[]
): boolean {
	const normalized = trimPathSlashes(path);
	if (!normalized) {
		return false;
	}
	const segments = normalized.split('/');
	if (segments.some((segment) => isUnsafeSegment(segment))) {
		return false;
	}
	return allowed.some((pattern) => matchesPattern(pattern, segments));
};

/**
 * Whether a URL is `http:` to a host other than loopback.
 *
 * @param url - The target URL.
 * @returns `true` for a cleartext remote target.
 */
export const isCleartextRemoteURL = function isCleartextRemoteURL(
	url: string
): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' && !LOOPBACK_HOSTS.has(parsed.hostname);
	} catch {
		return false;
	}
};

/**
 * Strips every identity-bearing header when the target is a cleartext,
 * non-loopback URL, so manifest and prefetch fetches follow the same rule
 * as the proxy: only the public browser allowlist crosses `http:`.
 *
 * @param headers - Headers a route collected from the visitor.
 * @param targetURL - Where they are about to be sent.
 * @returns The headers to send, or `undefined` when none remain.
 */
export const stripIdentityForCleartext = function stripIdentityForCleartext(
	headers: Record<string, string> | undefined,
	targetURL: string
): Record<string, string> | undefined {
	if (!headers || !isCleartextRemoteURL(targetURL)) {
		return headers;
	}
	const kept = Object.fromEntries(
		Object.entries(headers).filter(([name]) =>
			CONSENT_PROXY_PUBLIC_FORWARD_HEADERS.has(name.toLowerCase())
		)
	);
	return Object.keys(kept).length > 0 ? kept : undefined;
};

/**
 * Keeps only the named cookies from a `Cookie` request header.
 *
 * @param cookieHeader - The incoming `Cookie` header value.
 * @param names - Cookie names to keep.
 * @returns The filtered header, or `undefined` when nothing remains.
 */
export const filterCookieHeader = function filterCookieHeader(
	cookieHeader: string,
	names: readonly string[]
): string | undefined {
	const allowed = new Set(names);
	const kept = cookieHeader
		.split(';')
		.map((pair) => pair.trim())
		.filter((pair) => {
			const name = pair.split('=')[0]?.trim();
			return name !== undefined && allowed.has(name);
		});
	return kept.length > 0 ? kept.join('; ') : undefined;
};

/**
 * Whether the upstream request carries anything a response could vary by
 * per visitor: a known credential, or any caller-configured header outside
 * the public default allowlist (an API key, a tenant selector, ...).
 */
const carriesIdentity = function carriesIdentity(headers: Headers): boolean {
	for (const name of headers.keys()) {
		const lower = name.toLowerCase();
		if (CREDENTIAL_HEADERS.has(lower)) {
			return true;
		}
		if (
			!(
				CONSENT_PROXY_PUBLIC_FORWARD_HEADERS.has(lower) ||
				PROXY_SET_HEADERS.has(lower)
			)
		) {
			return true;
		}
	}
	return false;
};

/** Inputs for {@link buildConsentProxyRequestHeaders}. */
export interface BuildConsentProxyRequestHeadersInput {
	/** The incoming browser request. */
	request: Request;
	/** Lowercase browser headers to copy. */
	forwardHeaders: readonly string[];
	/** Cookie names to copy, if any. */
	cookieNames?: readonly string[];
	/** Hop-chain values the adapter vouches for. */
	forwarding: ConsentProxyForwarding;
	/** Package name sent as `x-c15t-proxy`, for example `@c15t/svelte`. */
	adapter: string;
}

/**
 * Builds the upstream request headers: the browser allowlist, then the
 * forwarding trio, then the c15t version header and `x-c15t-proxy`.
 *
 * @param input - Request, allowlists, forwarding values and adapter name.
 * @returns The headers for the upstream request.
 */
export const buildConsentProxyRequestHeaders =
	function buildConsentProxyRequestHeaders({
		adapter,
		cookieNames,
		forwardHeaders,
		forwarding,
		request,
	}: BuildConsentProxyRequestHeadersInput): Headers {
		const headers = new Headers();
		for (const name of forwardHeaders) {
			const value = request.headers.get(name);
			if (
				value === null ||
				CONSENT_PROXY_FORWARDING_HEADERS.has(name.toLowerCase())
			) {
				continue;
			}
			if (name === 'cookie') {
				const scoped = cookieNames
					? filterCookieHeader(value, cookieNames)
					: undefined;
				if (scoped) {
					headers.set(name, scoped);
				}
				continue;
			}
			headers.set(name, value);
		}

		if (forwarding.for) {
			headers.set('x-forwarded-for', forwarding.for);
		}
		headers.set('x-forwarded-host', forwarding.host);
		headers.set('x-forwarded-proto', forwarding.proto);
		for (const [name, value] of Object.entries(c15tVersionHeaders)) {
			headers.set(name, value);
		}
		headers.set('x-c15t-proxy', adapter);
		return headers;
	};

/**
 * Drops the `Domain=` attribute so a cookie the backend scoped to its own
 * host becomes host-only for the app origin.
 *
 * @param value - One `Set-Cookie` value.
 * @returns The value without its `Domain` attribute.
 */
export const rewriteProxySetCookie = function rewriteProxySetCookie(
	value: string
): string {
	return value
		.split(';')
		.filter((part) => !/^\s*domain\s*=/iu.test(part))
		.join(';');
};

const readSetCookies = function readSetCookies(headers: Headers): string[] {
	const withGetSetCookie = headers as Headers & {
		getSetCookie?: () => string[];
	};
	if (typeof withGetSetCookie.getSetCookie === 'function') {
		return withGetSetCookie.getSetCookie();
	}
	const single = headers.get('set-cookie');
	return single ? [single] : [];
};

/**
 * Builds the browser-facing response headers from the upstream response:
 * strips hop-by-hop headers (including those the upstream `Connection`
 * value names), body-encoding, and CORS headers, and re-appends each
 * `set-cookie` without its `Domain` attribute.
 *
 * @param upstream - The backend's response headers.
 * @returns Headers to send to the browser.
 */
export const buildConsentProxyResponseHeaders =
	function buildConsentProxyResponseHeaders(upstream: Headers): Headers {
		const headers = new Headers();
		const nominated = new Set(
			(upstream.get('connection') ?? '')
				.split(',')
				.map((token) => token.trim().toLowerCase())
				.filter(Boolean)
		);
		upstream.forEach((value, name) => {
			const lower = name.toLowerCase();
			if (
				STRIPPED_RESPONSE_HEADERS.has(lower) ||
				nominated.has(lower) ||
				STRIPPED_RESPONSE_PREFIXES.some((prefix) => lower.startsWith(prefix))
			) {
				return;
			}
			headers.set(lower, value);
		});
		for (const cookie of readSetCookies(upstream)) {
			headers.append('set-cookie', rewriteProxySetCookie(cookie));
		}
		return headers;
	};

/** Inputs for {@link forwardConsentRequest}. */
export interface ForwardConsentRequestInput {
	/** The incoming browser request. */
	request: Request;
	/** Path below the route prefix, for example `subjects/sub_1`. */
	path: string;
	/** Absolute backend base URL. */
	backendURL: string;
	/** Resolved proxy options. */
	options: ResolvedConsentProxyOptions;
	/** Hop-chain values the adapter vouches for. */
	forwarding: ConsentProxyForwarding;
	/** Package name sent as `x-c15t-proxy`, for example `@c15t/svelte`. */
	adapter: string;
	/** Fetch implementation. Defaults to `globalThis.fetch`. */
	fetch?: typeof globalThis.fetch;
}

const notFound = () => Response.json({ error: 'Not found' }, { status: 404 });

const isTimeoutError = (error: unknown): boolean =>
	(error as { name?: unknown } | null)?.name === 'TimeoutError';

/**
 * Forwards one request to `${backendURL}/${path}${search}` and returns the
 * upstream status and body as a stream, with headers shaped for the browser.
 *
 * Nothing identity-bearing crosses a cleartext link to a remote host: only
 * the public browser allowlist is sent, with no cookies and no
 * `x-forwarded-for`, so such a backend cannot use the visitor's IP address
 * for geolocation or rate limiting. A response to a request that carried
 * identity is marked `private, no-store`.
 *
 * @param input - Request, path, backend, options, forwarding and adapter.
 * @returns The upstream response, a 404 JSON response when `path` is not
 * allowed, a 504 when the upstream request times out, or a 502 when it
 * fails before a response arrives.
 * @example
 * ```ts
 * return forwardConsentRequest({
 *   adapter: '@c15t/example',
 *   backendURL: 'https://consent.example.com',
 *   forwarding: { host: url.host, proto: 'https' },
 *   options: resolveConsentProxyOptions(true)!,
 *   path: 'subjects',
 *   request,
 * });
 * ```
 */
export const forwardConsentRequest = async function forwardConsentRequest({
	adapter,
	backendURL,
	fetch: fetchImpl,
	forwarding,
	options,
	path,
	request,
}: ForwardConsentRequestInput): Promise<Response> {
	const normalized = trimPathSlashes(path);
	if (!isConsentProxyPathAllowed(normalized, options.paths)) {
		return notFound();
	}

	const { search } = new URL(request.url);
	const base = trimTrailingSlashes(backendURL);
	const target = `${base}/${normalized}${search}`;
	// The segment check above rejects anything the URL parser would fold, so
	// the parsed target must still sit exactly at the allowlisted path.
	const expectedPathname = `${trimTrailingSlashes(new URL(base).pathname)}/${normalized}`;
	if (new URL(target).pathname !== expectedPathname) {
		return notFound();
	}
	// Loopback is allowed in clear text for local development.
	const cleartextRemote = isCleartextRemoteURL(target);
	const method = request.method.toUpperCase();
	const init: RequestInit & { duplex?: 'half'; headers: Headers } = {
		headers: buildConsentProxyRequestHeaders({
			adapter,
			cookieNames: cleartextRemote ? undefined : options.cookieNames,
			forwardHeaders: cleartextRemote
				? options.forwardHeaders.filter((name) =>
						CONSENT_PROXY_PUBLIC_FORWARD_HEADERS.has(name.toLowerCase())
					)
				: options.forwardHeaders,
			forwarding: cleartextRemote
				? { ...forwarding, for: undefined }
				: forwarding,
			request,
		}),
		method,
		redirect: 'manual',
	};
	if (options.timeoutMs > 0 && typeof AbortSignal.timeout === 'function') {
		init.signal = AbortSignal.timeout(options.timeoutMs);
	}
	if (!BODYLESS_METHODS.has(method) && request.body) {
		init.body = request.body;
		init.duplex = 'half';
	}

	let upstream: Response;
	try {
		upstream = await (fetchImpl ?? globalThis.fetch)(target, init);
	} catch (error) {
		// An unreachable backend or the deadline above rejects `fetch`. Answer
		// as a gateway so the client sees JSON, not the framework's 500 page.
		return isTimeoutError(error)
			? Response.json({ error: 'Upstream timeout' }, { status: 504 })
			: Response.json({ error: 'Bad gateway' }, { status: 502 });
	}
	const responseHeaders = buildConsentProxyResponseHeaders(upstream.headers);
	if (carriesIdentity(init.headers)) {
		// The response may vary by the forwarded identity; never let a shared
		// cache reuse it for the next visitor.
		responseHeaders.set('cache-control', 'private, no-store');
		responseHeaders.delete('etag');
		responseHeaders.delete('last-modified');
	}
	return new Response(upstream.body, {
		headers: responseHeaders,
		status: upstream.status,
		statusText: upstream.statusText,
	});
};
