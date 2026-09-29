import type { KernelConfig } from '@c15t/core';

/**
 * How the request is read: the consent cookie name and explicit
 * geo/language overrides. Shared by {@link ResolveConsentOptions},
 * `c15tHandle` and `loadConsent`.
 */
export interface ConsentRequestOptions {
	/**
	 * Cookie name holding persisted consent. Defaults to `c15t` — the
	 * persistence module's storage key. Set this only if you customized
	 * `storageConfig.storageKey` client-side; it must match.
	 */
	cookieName?: string;
	/** Force the resolved country, ignoring geo headers. */
	country?: string;
	/** Force the resolved region, ignoring geo headers. */
	region?: string;
	/** Force the resolved language, ignoring `Accept-Language`. */
	language?: string;
}

/**
 * The visitor's resolved consent state: the JSON-serializable subset of
 * `KernelConfig` the server helpers return and the provider's `prefetch`
 * prop accepts. `transport` is omitted because it holds functions, which a
 * SvelteKit `load` cannot serialize.
 */
export type ConsentState = Omit<KernelConfig, 'transport'>;

/** Options for `resolveConsent`. */
export interface ResolveConsentOptions extends ConsentRequestOptions {
	/** The incoming request headers. */
	headers: Headers;
	/** Request clock shared with the client seed. */
	now?: number;
	/** Cookie header to read instead of `headers.get('cookie')`. */
	cookieHeader?: string | null;
	/**
	 * c15t backend base URL, absolute or origin-relative. When set, the
	 * helper calls `${backendURL}/init` and folds the response into the
	 * returned state. Omit it to only read cookies and headers.
	 *
	 * A relative URL resolves against `requestURL`, or the `host` header
	 * when there is none. `x-forwarded-*` headers are ignored unless
	 * `trustForwardedHeaders` is set.
	 */
	backendURL?: string;
	/**
	 * The URL SvelteKit resolved the request under (`event.url`). A
	 * relative `backendURL` resolves against its origin. `loadConsent`
	 * passes it for you.
	 */
	requestURL?: string | URL;
	/**
	 * Resolve a relative `backendURL` against the request's `forwarded`,
	 * `x-forwarded-host` and `x-forwarded-proto` headers. Any client can
	 * send those, so set this only behind a proxy that sets them and drops
	 * incoming ones. SvelteKit's own `ORIGIN`, `HOST_HEADER` and
	 * `PROTOCOL_HEADER` settings already shape `event.url`, which is usually
	 * the better place to configure this. Also forwards those three headers
	 * to the backend, which is skipped otherwise.
	 *
	 * @defaultValue false
	 */
	trustForwardedHeaders?: boolean;
	/** Fetch implementation for the `/init` call. */
	fetch?: typeof globalThis.fetch;
	/**
	 * Default request fetch supplied by the SvelteKit adapter.
	 * @internal
	 */
	frameworkFetch?: typeof globalThis.fetch;
	/**
	 * Extra request headers to forward to the backend. `forwarded`,
	 * `x-forwarded-host` and `x-forwarded-proto` are skipped unless
	 * `trustForwardedHeaders` is set.
	 */
	forwardHeaders?: string[];
}
