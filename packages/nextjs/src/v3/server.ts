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

import { type InitOutput, resolveBackendURL } from '@c15t/schema/types';
import {
	createManifestTransport,
	type KernelConfig,
	type KernelOverrides,
	mergeInitOutputIntoKernelConfig,
	mergeInitResponseIntoKernelConfig,
} from 'c15t/v3';
import { readStoredConsentFromCookie } from 'c15t/v3/modules/persistence';
import { cookies, headers } from 'next/headers';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
} from './headers';

export interface ReadInitialConsentConfigOptions {
	/**
	 * Cookie name holding persisted consent. Defaults to `c15t` — the
	 * persistence module's storage key. Set this only if you customized
	 * `storageConfig.storageKey` client-side; it must match.
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
 * Derive a `KernelConfig` from the current Next.js request.
 *
 * What it reads:
 * - Cookie (default: `c15t`, the persistence storage key) — read via the
 *   shared v2-compatible parser, exactly as the client persists it.
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
	const headerStore = await headers();

	// The persistence module writes the `c15t` cookie in the v2-compatible
	// compact format — read it with the same shared parser the client uses,
	// so the server sees exactly what the client persisted (returning
	// visitors must not get the banner re-rendered into the first HTML).
	// `cookieName` only matters if the consumer customized
	// `storageConfig.storageKey` client-side.
	const cookieHeader = (headerStore as Headers).get?.('cookie') ?? undefined;
	const persisted = readStoredConsentFromCookie(
		cookieHeader,
		options.cookieName ? { storageKey: options.cookieName } : undefined
	);
	const storedConsent =
		persisted?.consents && persisted.consentInfo
			? {
					consents: persisted.consents,
					subjectId:
						typeof persisted.consentInfo.subjectId === 'string'
							? persisted.consentInfo.subjectId
							: undefined,
				}
			: undefined;

	const inputs = extractConsentRequestInputs(headerStore as Headers, {
		country: options.country,
		language: options.language,
	});

	const overrides: KernelOverrides = {};
	if (inputs.country) overrides.country = inputs.country;
	if (inputs.region) overrides.region = inputs.region;
	if (inputs.language) overrides.language = inputs.language;
	if (inputs.gpc !== undefined) overrides.gpc = inputs.gpc;

	const config: KernelConfig = {};
	if (storedConsent) {
		config.initialConsents = storedConsent.consents;
		config.initialHasConsented = true;
		if (storedConsent.subjectId) {
			config.initialSubjectId = storedConsent.subjectId;
		}
	}
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
	 * Same-origin or absolute `GET /manifest` URL. When set, prefetch resolves
	 * init locally from the cached manifest and does not call `/init`.
	 */
	manifestURL?: string;

	/**
	 * Inline manifest for hosts that already loaded it. Takes precedence over
	 * `manifestURL` and keeps the request path backend-free.
	 */
	manifest?: Parameters<typeof createManifestTransport>[0]['manifest'];

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
	if (!absoluteBackend) return base;
	const absoluteManifest = options.manifestURL
		? resolveBackendURL(options.manifestURL, requestHeaders)
		: undefined;
	if (options.manifestURL && !absoluteManifest) return base;

	// Build forwarding headers: cookies + any explicitly-forwarded keys.
	const forward: Record<string, string> = {};
	const cookieHeader = requestCookies.toString();
	if (cookieHeader) forward.cookie = cookieHeader;
	for (const key of options.forwardHeaders ?? []) {
		const value = requestHeaders.get(key);
		if (value) forward[key.toLowerCase()] = value;
	}

	if (options.manifest || absoluteManifest) {
		const manifestInputs = extractConsentRequestInputs(
			requestHeaders as Headers,
			{
				country: options.country,
				language: options.language,
			}
		);
		const transport = createManifestTransport({
			backendURL: absoluteBackend,
			manifestURL: absoluteManifest ?? undefined,
			manifest: options.manifest,
			fetch: options.fetch,
			headers: forward,
			inputs: manifestInputs,
		});

		try {
			const response = await transport.init?.({
				overrides: {
					...(base.initialOverrides ?? {}),
					...consentInputsToOverrides(manifestInputs),
				},
				user: base.initialUser ?? null,
			});
			if (!response) return base;
			return mergeInitResponseIntoKernelConfig(base, response);
		} catch {
			return base;
		}
	}

	try {
		const response = await fetchHostedInit({
			backendURL: absoluteBackend,
			fetch: options.fetch,
			headers: {
				...forward,
				...createInitHeadersFromOverrides(base.initialOverrides ?? {}),
			},
		});
		return mergeInitOutputIntoKernelConfig(base, response);
	} catch {
		// Silent degradation. Client-side init will retry.
		return base;
	}
}

function createInitHeadersFromOverrides(
	overrides: Readonly<KernelOverrides>
): Record<string, string> {
	const headers: Record<string, string> = {};
	if (overrides.country) headers['x-c15t-country'] = overrides.country;
	if (overrides.region) headers['x-c15t-region'] = overrides.region;
	if (overrides.language) headers['accept-language'] = overrides.language;
	if (overrides.gpc !== undefined)
		headers['sec-gpc'] = overrides.gpc ? '1' : '0';
	return headers;
}

async function fetchHostedInit(input: {
	backendURL: string;
	fetch?: typeof globalThis.fetch;
	headers: Record<string, string>;
}): Promise<InitOutput> {
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error('prefetchInitialConsent: no fetch available.');
	}
	const response = await fetchImpl(`${input.backendURL}/init`, {
		method: 'GET',
		cache: 'no-store',
		credentials: 'include',
		headers: {
			accept: 'application/json',
			...input.headers,
		},
	});
	if (!response.ok) {
		throw new Error(
			`prefetchInitialConsent: /init responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as InitOutput;
}
