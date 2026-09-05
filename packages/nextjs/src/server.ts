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
	createHostedTransport,
	mergeInitResponseIntoKernelConfig,
} from '@c15t/core';
import type { KernelConfig, KernelOverrides } from '@c15t/core';
import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
import { createManifestTransport } from '@c15t/core/transports/manifest';
import { resolveBackendURL } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import { extractConsentRequestInputs } from './headers';
import type { InitialConsentConfig } from './types';

type Awaitable<Value> = Promise<Value> | Value;

interface NextRequestContext {
	cookies: () => Awaitable<{ toString: () => string }>;
	headers: () => Awaitable<Headers>;
}

const defaultNextRequestContext: NextRequestContext = {
	async cookies() {
		const nextHeaders = await import('next/headers');
		return nextHeaders.cookies();
	},
	async headers() {
		const nextHeaders = await import('next/headers');
		return (await nextHeaders.headers()) as Headers;
	},
};

export interface ReadInitialConsentConfigOptions {
	/** One request clock reused for record validation and client hydration. */
	now?: number;

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
): Promise<InitialConsentConfig> {
	const request = options.request ?? defaultNextRequestContext;
	const headerStore = await request.headers();

	const now = options.now ?? Date.now();
	const cookieHeader =
		headerStore.get('cookie') ?? (await request.cookies()).toString();
	const initialRecords = readStoredRecordsFromCookieHeader(
		cookieHeader,
		options.cookieName ? { storageKey: options.cookieName } : undefined,
		now
	);

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
	const config: KernelConfig = {
		initialPrivacySignals: { gpc: inputs.gpc },
		initialRecords,
		now,
	};
	if (Object.keys(overrides).length > 0) {
		config.initialOverrides = overrides;
	}

	return config;
};

/**
 * Type alias re-exported so consumers can stay within `@c15t/nextjs`.
 */
export type { InitialConsentConfig } from './types';

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

/** Remove legacy projections after shared wire preparation. */
const prepareConfig = (
	base: KernelConfig,
	response: Parameters<typeof mergeInitResponseIntoKernelConfig>[1]
): KernelConfig => {
	const config = mergeInitResponseIntoKernelConfig(base, response);
	config.initialRecords = {
		...base.initialRecords,
		...response?.records,
		now: base.now,
	};
	if (response?.subjectId && response.records?.subject === undefined) {
		config.initialRecords.subject = {
			...config.initialRecords.subject,
			subjectId: response.subjectId,
		};
	}
	delete config.initialDraft;
	if (config.initialPolicyResolution?.status !== 'matched') {
		delete config.initialPolicySnapshotToken;
		delete config.initialIab;
	}
	return config;
};

const initContextFor = (base: KernelConfig) => ({
	overrides: base.initialOverrides ?? {},
	user: base.initialUser ?? null,
});

const hostedPrefetchTransport = (
	options: PrefetchInitialConsentOptions,
	base: KernelConfig,
	backendURL: string,
	forward: Record<string, string>
) => {
	const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
	const headers = createInitHeadersFromOverrides(base.initialOverrides ?? {});
	if (base.initialPrivacySignals?.gpc !== undefined) {
		headers['sec-gpc'] = base.initialPrivacySignals.gpc ? '1' : '0';
	}
	return createHostedTransport({
		backendURL,
		fetch: (url, init) =>
			fetchImpl(url, {
				...init,
				cache: 'no-store',
				headers: { ...forward, ...init?.headers },
			}),
		headers,
	});
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
): Promise<InitialConsentConfig> {
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
	const cookieHeader =
		requestHeaders.get('cookie') ?? requestCookies.toString();
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
			const response = await transport.init?.(initContextFor(base));
			if (!response) {
				return base;
			}
			return prepareConfig(base, response);
		} catch {
			return base;
		}
	}

	try {
		const transport = hostedPrefetchTransport(
			options,
			base,
			absoluteBackend,
			forward
		);
		const response = await transport.init?.(initContextFor(base));
		return prepareConfig(base, response);
	} catch {
		// Silent degradation. Client-side init will retry.
		return base;
	}
};
