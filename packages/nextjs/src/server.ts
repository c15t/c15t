/**
 * `@c15t/nextjs/server` server-only helpers.
 *
 * Reads the incoming Next.js request (cookies + headers via next/headers)
 * and produces a JSON-serializable `KernelConfig`. The Server Component
 * awaits this and passes it as a plain prop to the client `ConsentBoundary`.
 *
 * Server Components await `readInitialConsentConfig()` and pass its plain data
 * to `<ConsentBoundary config={...}>`. The client boundary creates one kernel
 * per mount, so concurrent requests do not share runtime state.
 *
 * This file imports `next/headers` and must only be called in a Server
 * Component or route handler. It is NOT marked `'use server'` because it
 * is a plain async function, not an action.
 */

import {
	mergeInitOutputIntoKernelConfig,
	mergeInitResponseIntoKernelConfig,
} from '@c15t/core';
import type { KernelConfig, KernelOverrides } from '@c15t/core';
import { readStoredConsentFromCookie } from '@c15t/core/modules/persistence';
import { createManifestTransport } from '@c15t/core/transports/manifest';
import { resolveBackendURL } from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
} from './headers';

type Awaitable<Value> = Promise<Value> | Value;

interface NextRequestContext {
	cookies: () => Awaitable<{ toString: () => string }>;
	headers: () => Awaitable<Headers>;
}

const defaultNextRequestContext: NextRequestContext = {
	async cookies() {
		const nextHeaders = await import('next/headers.js');
		return nextHeaders.cookies();
	},
	async headers() {
		const nextHeaders = await import('next/headers.js');
		return (await nextHeaders.headers()) as Headers;
	},
};

export interface ReadInitialConsentConfigOptions {
	/**
	 * Cookie name holding persisted consent. Defaults to `c15t`, the
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

	/**
	 * Request context adapter. Intended for tests and advanced framework
	 * wrappers that provide Next-compatible request helpers.
	 * @internal
	 */
	request?: NextRequestContext;
}

/**
 * Derive a `KernelConfig` from the current Next.js request.
 *
 * What it reads:
 * - Cookie, defaulting to `c15t`, read with the persistence parser.
 * - `x-vercel-ip-country`, `cf-ipcountry`, or `x-country` for geo.
 * - `x-vercel-ip-country-region` or `cf-region-code` for region.
 * - The first `accept-language` entry for language.
 *
 * What it does NOT do:
 * - Does not fetch from the backend. Banner info / translations come from
 *   boot modules once the client kernel mounts.
 * - Does not set cookies. Writes happen client-side via the persistence
 *   boot module.
 * - Does not cache across requests. Each call reads fresh headers, so
 *   Fluid Compute concurrent requests stay isolated.
 */
export const readInitialConsentConfig = async function readInitialConsentConfig(
	options: ReadInitialConsentConfigOptions = {}
): Promise<KernelConfig> {
	const request = options.request ?? defaultNextRequestContext;
	const headerStore = await request.headers();

	// The persistence module writes the `c15t` cookie in a compact format.
	// Read it with the same shared parser the client uses,
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
	if (inputs.country) {
		overrides.country = inputs.country;
	}
	if (inputs.region) {
		overrides.region = inputs.region;
	}
	if (inputs.language) {
		overrides.language = inputs.language;
	}
	if (inputs.gpc !== undefined) {
		overrides.gpc = inputs.gpc;
	}

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
};

/**
 * Type alias re-exported so consumers can stay within `@c15t/nextjs`.
 */
export type { KernelConfig } from '@c15t/core';

// -- Optional: server-side prefetch of the init roundtrip -------------------

export interface PrefetchInitialConsentOptions extends ReadInitialConsentConfigOptions {
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

const createInitHeadersFromOverrides = function createInitHeadersFromOverrides(
	overrides: Readonly<KernelOverrides>
): Record<string, string> {
	const headersLocal: Record<string, string> = {};
	if (overrides.country) {
		headersLocal['x-c15t-country'] = overrides.country;
	}
	if (overrides.region) {
		headersLocal['x-c15t-region'] = overrides.region;
	}
	if (overrides.language) {
		headersLocal['accept-language'] = overrides.language;
	}
	if (overrides.gpc !== undefined) {
		headersLocal['sec-gpc'] = overrides.gpc ? '1' : '0';
	}
	return headersLocal;
};

const fetchHostedInit = async function fetchHostedInit(input: {
	backendURL: string;
	fetch?: typeof globalThis.fetch;
	headers: Record<string, string>;
}): Promise<InitOutput> {
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error('prefetchInitialConsent: no fetch available.');
	}
	const response = await fetchImpl(`${input.backendURL}/init`, {
		cache: 'no-store',
		credentials: 'include',
		headers: {
			accept: 'application/json',
			...input.headers,
		},
		method: 'GET',
	});
	if (!response.ok) {
		throw new Error(
			`prefetchInitialConsent: /init responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as InitOutput;
};

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
export const prefetchInitialConsent = async function prefetchInitialConsent(
	options: PrefetchInitialConsentOptions
): Promise<KernelConfig> {
	const base = await readInitialConsentConfig(options);
	const request = options.request ?? defaultNextRequestContext;
	const requestHeaders = await request.headers();
	const requestCookies = await request.cookies();

	const absoluteBackend = resolveBackendURL(options.backendURL, requestHeaders);
	if (!absoluteBackend) {
		return base;
	}
	const absoluteManifest = options.manifestURL
		? resolveBackendURL(options.manifestURL, requestHeaders)
		: undefined;
	if (options.manifestURL && !absoluteManifest) {
		return base;
	}

	// Build forwarding headers: cookies + any explicitly-forwarded keys.
	const forward: Record<string, string> = {};
	const cookieHeader = requestCookies.toString();
	if (cookieHeader) {
		forward.cookie = cookieHeader;
	}
	for (const key of options.forwardHeaders ?? []) {
		const value = requestHeaders.get(key);
		if (value) {
			forward[key.toLowerCase()] = value;
		}
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
			baseTranslations,
			fetch: options.fetch,
			headers: forward,
			inputs: manifestInputs,
			manifest: options.manifest,
			manifestURL: absoluteManifest ?? undefined,
		});

		try {
			const response = await transport.init?.({
				overrides: {
					...(base.initialOverrides ?? {}),
					...consentInputsToOverrides(manifestInputs),
				},
				user: base.initialUser ?? null,
			});
			if (!response) {
				return base;
			}
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
};
