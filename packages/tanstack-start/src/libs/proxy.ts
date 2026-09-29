/**
 * Opt-in same-origin proxy for the consent server route.
 *
 * Lets a Start app point `ConsentRoot backendURL="/api/c15t"` at its own
 * origin, the way a Next.js app uses a `next.config` rewrite. The path
 * allowlist, header shaping and response handling live in
 * `@c15t/core/server`, shared with the SvelteKit adapter. This module adds
 * what is specific to Start: `trustForwardedHeaders`, which decides whether
 * the client IP chain and the incoming `x-forwarded-host` and
 * `x-forwarded-proto` are believed.
 */

import {
	CONSENT_PROXY_FORWARDING_HEADERS,
	forwardConsentRequest,
	isConsentProxyPathAllowed,
	resolveConsentProxyOptions,
	rewriteProxySetCookie,
	stripIdentityForCleartext as stripIdentity,
} from '@c15t/core/server';
import type {
	ConsentProxyForwarding,
	ConsentProxyOptions,
	ResolvedConsentProxyOptions,
} from '@c15t/core/server';
import { getIpAddress } from '@c15t/schema/geo';

export type { ConsentProxyOptions } from '@c15t/core/server';

/** Value of the `x-c15t-proxy` header added to every forwarded request. */
export const PROXY_HEADER_VALUE = '@c15t/tanstack-start';

/** Resolved proxy configuration shared by the handler factory. */
export interface ResolvedProxyOptions extends ResolvedConsentProxyOptions {
	/**
	 * Forward the client IP chain. Only true behind a trusted proxy that
	 * sets `x-forwarded-for` itself; otherwise the first hop is whatever the
	 * client claimed and forwarding it would let a visitor pick the address
	 * the backend and its WAF see.
	 */
	trustForwardedHeaders: boolean;
}

/**
 * Normalizes `proxy: boolean | ConsentProxyOptions` into a resolved config,
 * or `undefined` when the proxy is off.
 */
export const resolveProxyOptions = function resolveProxyOptions(
	proxy: boolean | ConsentProxyOptions | undefined,
	trustForwardedHeaders = false
): ResolvedProxyOptions | undefined {
	const resolved = resolveConsentProxyOptions(proxy);
	return resolved ? { ...resolved, trustForwardedHeaders } : undefined;
};

/** Headers that describe the hop chain; never copied from the browser. */
export const FORWARDING_HEADERS: ReadonlySet<string> =
	CONSENT_PROXY_FORWARDING_HEADERS;

/** `true` when `path` is allowed through the proxy. */
export const isProxyPathAllowed = isConsentProxyPathAllowed;

/** Drops the `Domain=` attribute from one `Set-Cookie` value. */
export const rewriteSetCookie = rewriteProxySetCookie;

/**
 * Strips every identity-bearing header when the target is a cleartext,
 * non-loopback URL.
 */
export const stripIdentityForCleartext = stripIdentity;

/**
 * The client IP chain from the platform's proxy headers
 * (`x-forwarded-for`, `cf-connecting-ip`, `x-real-ip`, ...), with the
 * resolved client address appended when the chain lacks it.
 */
const readForwardedFor = function readForwardedFor(
	incoming: Headers
): string | undefined {
	// Unmasked on purpose: the WAF needs the real address to rate-limit and
	// score the visitor, and the backend masks before it stores anything.
	const clientIp = getIpAddress(incoming, { masking: false });
	const chain = (incoming.get('x-forwarded-for') ?? '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
	if (clientIp && !chain.includes(clientIp)) {
		chain.push(clientIp);
	}
	return chain.length > 0 ? chain.join(', ') : undefined;
};

/**
 * The hop-chain values for a request. Without `trustForwardedHeaders` the
 * incoming forwarding headers are client-controlled, and a `Request`
 * carries no socket address to check them against, so only the request URL
 * is believed and no client IP is sent.
 */
const readForwarding = function readForwarding(
	request: Request,
	trustForwardedHeaders: boolean
): ConsentProxyForwarding {
	const { host, protocol } = new URL(request.url);
	const proto = protocol.replace(/:$/u, '');
	if (!trustForwardedHeaders) {
		return { host, proto };
	}
	return {
		for: readForwardedFor(request.headers),
		host: request.headers.get('x-forwarded-host') ?? host,
		proto: request.headers.get('x-forwarded-proto') ?? proto,
	};
};

/** Inputs for {@link proxyConsentRequest}. */
export interface ProxyConsentRequestInput {
	/** The incoming browser request. */
	request: Request;
	/** Splat path below the route prefix, for example `subjects/sub_1`. */
	path: string;
	/** Absolute backend base URL, without a trailing slash. */
	backendURL: string;
	/** Resolved proxy options. */
	options: ResolvedProxyOptions;
	/** Fetch implementation. Defaults to `globalThis.fetch`. */
	fetch?: typeof globalThis.fetch;
}

/**
 * Forwards one request to `${backendURL}/${path}${search}` and returns the
 * upstream status and body as a stream, with headers shaped for the browser.
 *
 * @returns A 404 JSON response when `path` is not allowlisted.
 */
export const proxyConsentRequest = function proxyConsentRequest({
	backendURL,
	fetch,
	options,
	path,
	request,
}: ProxyConsentRequestInput): Promise<Response> {
	return forwardConsentRequest({
		adapter: PROXY_HEADER_VALUE,
		backendURL,
		fetch,
		forwarding: readForwarding(request, options.trustForwardedHeaders),
		options,
		path,
		request,
	});
};
