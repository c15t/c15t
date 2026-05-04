/**
 * @c15t/nextjs/v3/server — server-only helpers.
 *
 * Reads the incoming Next.js request (cookies + headers via next/headers)
 * and produces a JSON-serializable `KernelConfig`. The Server Component
 * awaits this and passes it as a plain prop to the client `ConsentBoundary`.
 *
 * Contrast with v2's `fetchInitialData()`, which returned an unawaited
 * `Promise<SSRInitialData>` that the consumer had to thread through props
 * without awaiting. That pattern leaks an async boundary into the public
 * API and trips up Next.js error-handling around serialization.
 *
 * v3 approach:
 *   1. Server Component awaits `readInitialConsentConfig()` — returns plain data.
 *   2. That plain data is passed to `<ConsentBoundary config={...}>`.
 *   3. Client boundary creates the kernel inside `useState(() => ...)`, so
 *      the kernel is per-mount, never module-level. Fluid Compute safe.
 *
 * This file imports `next/headers` and must only be called in a Server
 * Component or route handler. It is NOT marked `'use server'` because it
 * is a plain async function, not an action.
 */
import {
	type ConsentState,
	createHostedTransport,
	type KernelConfig,
	type KernelOverrides,
} from 'c15t/v3';
import { cookies, headers } from 'next/headers';

const CONSENT_COOKIE_DEFAULT = 'c15t-consent';

export interface ReadInitialConsentConfigOptions {
	/**
	 * Cookie name holding serialized consent state. Defaults to `c15t-consent`.
	 * Must match whatever the persistence boot module writes client-side.
	 */
	cookieName?: string;

	/**
	 * If provided, override the auto-detected country from request headers.
	 * Mainly useful for tests.
	 */
	country?: string;

	/**
	 * If provided, override the auto-detected language.
	 */
	language?: string;
}

/**
 * Extract the first entry from an Accept-Language header, stripping any
 * quality suffix. Returns undefined if the header is absent or
 * unparseable.
 */
function parseAcceptLanguage(header: string | null): string | undefined {
	if (!header) return undefined;
	const first = header.split(',')[0]?.trim();
	if (!first) return undefined;
	const code = first.split(';')[0]?.trim();
	return code && code.length <= 10 ? code : undefined;
}

/**
 * Extract consent state from a cookie value. Accepts the JSON shape
 * `{ "necessary": true, "marketing": false, ... }`. Silently ignores
 * malformed cookies — consent defaults to all-false-except-necessary.
 */
function parseConsentCookie(
	value: string | undefined
): Partial<ConsentState> | undefined {
	if (!value) return undefined;
	try {
		const decoded = decodeURIComponent(value);
		const parsed = JSON.parse(decoded) as Partial<ConsentState>;
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed;
		}
	} catch {
		// Malformed cookie — consumer will get defaults.
	}
	return undefined;
}

/**
 * Derive a `KernelConfig` from the current Next.js request.
 *
 * What it reads:
 * - Cookie (default: `c15t-consent`) — deserializes prior consent state.
 * - `x-vercel-ip-country` / `cf-ipcountry` / `x-country` — geo override.
 * - `x-vercel-ip-country-region` / `cf-region-code` — region override.
 * - `accept-language` — language override (first entry only).
 *
 * What it does NOT do:
 * - Does not fetch from the backend. Banner info / translations come from
 *   boot modules once the client kernel mounts.
 * - Does not set cookies. Writes happen client-side via the persistence
 *   boot module.
 * - Does not cache across requests. Each call reads fresh headers, so
 *   Fluid Compute concurrent requests stay isolated.
 */
export async function readInitialConsentConfig(
	options: ReadInitialConsentConfigOptions = {}
): Promise<KernelConfig> {
	const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

	const cookieName = options.cookieName ?? CONSENT_COOKIE_DEFAULT;
	const consentCookie = cookieStore.get(cookieName)?.value;
	const initialConsents = parseConsentCookie(consentCookie);

	const country =
		options.country ??
		headerStore.get('x-vercel-ip-country') ??
		headerStore.get('cf-ipcountry') ??
		headerStore.get('x-country') ??
		undefined;

	const region =
		headerStore.get('x-vercel-ip-country-region') ??
		headerStore.get('cf-region-code') ??
		undefined;

	const language =
		options.language ?? parseAcceptLanguage(headerStore.get('accept-language'));

	const overrides: KernelOverrides = {};
	if (country) overrides.country = country;
	if (region) overrides.region = region;
	if (language) overrides.language = language;

	const config: KernelConfig = {};
	if (initialConsents) config.initialConsents = initialConsents;
	if (Object.keys(overrides).length > 0) {
		config.initialOverrides = overrides;
	}

	return config;
}

/**
 * Type alias re-exported for convenience — consumers never need to import
 * from `c15t/v3` directly for SSR.
 */
export type { KernelConfig } from 'c15t/v3';

// -- Optional: server-side prefetch of the init roundtrip -------------------

export interface PrefetchInitialConsentOptions
	extends ReadInitialConsentConfigOptions {
	/**
	 * Backend base URL. When provided, the helper will also call
	 * `${backendURL}/init` server-side and fold the response into the
	 * returned prefetch config (policy, UI, translations, IAB metadata,
	 * and consents if the backend knows the user). This avoids a
	 * first-paint flicker before the client-side init lands.
	 *
	 * Relative URLs are resolved via the request headers (`x-forwarded-proto`,
	 * `host`) so the backend call works under any reverse-proxy.
	 */
	backendURL: string;

	/**
	 * Override fetch. Useful for testing or for wiring Vercel's
	 * unstable_cache / Next.js `fetch`-level caching around the call.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * Forward additional request headers onto the backend call. Cookies
	 * from the incoming request are forwarded automatically. Use this for
	 * authentication tokens or custom tracing headers.
	 */
	forwardHeaders?: string[];
}

/**
 * Resolve a `backendURL` that might be relative into an absolute URL
 * the server-side fetch can call without a protocol/host error.
 */
function resolveBackendURL(
	backendURL: string,
	requestHeaders: Headers
): string {
	if (/^https?:\/\//i.test(backendURL)) return backendURL;
	const proto =
		requestHeaders.get('x-forwarded-proto') ??
		(requestHeaders.get('x-forwarded-ssl') === 'on' ? 'https' : 'http');
	const host =
		requestHeaders.get('x-forwarded-host') ??
		requestHeaders.get('host') ??
		'localhost';
	return `${proto}://${host}${backendURL.startsWith('/') ? '' : '/'}${backendURL}`;
}

/**
 * Server-side consent prefetch.
 *
 * 1. Reads cookies + geo headers like `readInitialConsentConfig`.
 * 2. Calls `${backendURL}/init` server-side with the request context.
 * 3. Folds the response into a `KernelConfig` so first paint is correct
 *    without waiting for a client roundtrip.
 *
 * If the backend call fails, returns the baseline config (silent
 * degradation — the client boundary will retry on mount).
 */
export async function prefetchInitialConsent(
	options: PrefetchInitialConsentOptions
): Promise<KernelConfig> {
	const base = await readInitialConsentConfig(options);
	const requestHeaders = await headers();
	const requestCookies = await cookies();

	const absoluteBackend = resolveBackendURL(options.backendURL, requestHeaders);

	// Build forwarding headers: cookies + any explicitly-forwarded keys.
	const forward: Record<string, string> = {};
	const cookieHeader = requestCookies.toString();
	if (cookieHeader) forward.cookie = cookieHeader;
	for (const key of options.forwardHeaders ?? []) {
		const value = requestHeaders.get(key);
		if (value) forward[key.toLowerCase()] = value;
	}

	const transport = createHostedTransport({
		backendURL: absoluteBackend,
		fetch: options.fetch,
		headers: forward,
	});

	try {
		const response = await transport.init?.({
			overrides: base.initialOverrides ?? {},
			user: base.initialUser ?? null,
		});
		if (!response) return base;

		const merged: KernelConfig = { ...base };
		if (response.resolvedOverrides) {
			merged.initialOverrides = {
				...(base.initialOverrides ?? {}),
				...response.resolvedOverrides,
			};
		}
		if (response.consents) {
			merged.initialConsents = {
				...(base.initialConsents ?? {}),
				...response.consents,
			};
		}
		if (response.location !== undefined)
			merged.initialLocation = response.location;
		if (response.translations !== undefined) {
			merged.initialTranslations = response.translations;
		}
		if (response.branding !== undefined)
			merged.initialBranding = response.branding;
		if (response.policy !== undefined) merged.initialPolicy = response.policy;
		if (response.policyDecision !== undefined) {
			merged.initialPolicyDecision = response.policyDecision;
		}
		if (response.policySnapshotToken !== undefined) {
			merged.initialPolicySnapshotToken = response.policySnapshotToken;
		}
		if (
			response.gvl !== undefined ||
			response.customVendors !== undefined ||
			response.cmpId !== undefined
		) {
			merged.initialIab = {
				...(merged.initialIab ?? {}),
				...(response.gvl !== undefined
					? { gvl: response.gvl, enabled: response.gvl !== null }
					: {}),
				...(response.customVendors !== undefined
					? { customVendors: response.customVendors }
					: {}),
				...(response.cmpId !== undefined ? { cmpId: response.cmpId } : {}),
			};
		}
		return merged;
	} catch {
		// Silent degradation. Client-side init will retry.
		return base;
	}
}
