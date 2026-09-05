/**
 * Server helpers for `@c15t/astro`.
 *
 * These run inside the Astro middleware and the injected API routes. They
 * read the incoming request, resolve the consent decision for it, and
 * produce the `KernelConfig` the page inlines so the browser boots without
 * an `/init` roundtrip.
 */

import {
	createConsentKernel,
	createOfflineTransport,
	defaultTranslationConfig,
	mergeInitOutputIntoKernelConfig,
	mergeInitResponseIntoKernelConfig,
} from '@c15t/core';
import type {
	ConsentSnapshot,
	KernelConfig,
	KernelOverrides,
	KernelTranslations,
	TranslationsResponse,
} from '@c15t/core';
import {
	CONSENT_STORAGE_KEY,
	readStoredConsentFromCookie,
} from '@c15t/core/modules/persistence';
import { createManifestTransport } from '@c15t/core/transports/manifest';
import {
	CONSENT_REQUEST_HEADER_NAMES,
	consentInputsToOverrides,
	extractConsentRequestInputs,
	resolveBackendURL,
} from '@c15t/schema/types';
import type {
	ConsentRequestHeaderInputs,
	InitOutput,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import { filterCookieHeader } from './libs/cookies';
import { buildInlineOfflinePolicy } from './mode';
import type { C15tLocals, C15tResolvedOptions } from './types';

/** Input for {@link resolveConsentContext}. */
export interface ResolveConsentContextOptions {
	/** The incoming request headers. */
	headers: Headers;
	/**
	 * The absolute request URL. Used to resolve a relative `backendURL` or
	 * `manifestURL` against this request's own origin and protocol; without
	 * it the shared resolver assumes `https`.
	 */
	url?: string;
	/** The integration options, already normalized. */
	options: C15tResolvedOptions;
	/** Override fetch, mainly for tests. */
	fetch?: typeof globalThis.fetch;
	/**
	 * Skip the server-side init roundtrip and return cookie + geo only.
	 * Useful for static output where every request shares one render.
	 */
	skipPrefetch?: boolean;
}

/**
 * Resolve the language the surfaces should render in.
 *
 * @param options - Integration options.
 * @param inputs - Request inputs from the geo/language headers.
 * @returns The kernel translations for this request.
 */
export const resolveTranslations = function resolveTranslations(
	options: C15tResolvedOptions,
	inputs: ConsentRequestHeaderInputs
): KernelTranslations {
	const detect = options.i18n?.detectLanguage !== false;
	const language =
		options.i18n?.locale ??
		(detect ? inputs.language : undefined) ??
		defaultTranslationConfig.defaultLanguage ??
		'en';
	// The server can afford the whole catalogue; only the one negotiated
	// bundle is inlined into the page, so the client pays for one language.
	const catalogue = baseTranslations as unknown as Record<
		string,
		TranslationsResponse
	>;
	const base =
		catalogue[language] ??
		(defaultTranslationConfig.translations.en as TranslationsResponse);
	const overrides = options.i18n?.messages?.[language] as
		| Partial<TranslationsResponse>
		| undefined;
	return {
		language,
		translations: overrides ? { ...base, ...overrides } : base,
	};
};

/**
 * Read cookies and geo headers into a baseline `KernelConfig`.
 *
 * Does no network work and sets no cookies, so it is safe on every runtime
 * including static prerenders.
 *
 * @param headers - The incoming request headers.
 * @param options - The integration options.
 * @returns A config seeded with stored consent and request overrides.
 */
export const readInitialConsentConfig = function readInitialConsentConfig(
	headers: Headers,
	options: C15tResolvedOptions
): { config: KernelConfig; inputs: ConsentRequestHeaderInputs } {
	const persisted = readStoredConsentFromCookie(
		headers.get('cookie') ?? undefined,
		options.storageConfig
	);
	// An explicit `i18n.locale` outranks Accept-Language negotiation.
	const inputs = extractConsentRequestInputs(headers, {
		language: options.i18n?.locale,
	});

	const config: KernelConfig = {};
	if (persisted?.consents && persisted.consentInfo) {
		config.initialConsents = persisted.consents;
		config.initialHasConsented = true;
		const { subjectId } = persisted.consentInfo as { subjectId?: unknown };
		if (typeof subjectId === 'string') {
			config.initialSubjectId = subjectId;
		}
	}
	const overrides = consentInputsToOverrides(inputs) as KernelOverrides;
	if (Object.keys(overrides).length > 0) {
		config.initialOverrides = overrides;
	}
	return { config, inputs };
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** The cookie name the persistence module reads for this configuration. */
const consentCookieName = function consentCookieName(
	options: C15tResolvedOptions
): string {
	return options.storageConfig?.storageKey ?? CONSENT_STORAGE_KEY;
};

/**
 * Resolves a possibly-relative configured URL against this request.
 *
 * Only the request's own URL or `Host` decides the origin — never an
 * inbound `x-forwarded-host` / `x-forwarded-proto`. The adapter builds
 * `Request.url` from whatever proxy configuration the deployment declared,
 * so trusting a forwarded header on top of it would let a forged header
 * steer this server-side fetch, cookies and all, at a host of the caller's
 * choosing. Seeding the protocol from the request URL also keeps a relative
 * URL resolving on a plain `http://localhost` dev server, where the shared
 * resolver would otherwise assume `https`.
 */
const resolveAgainstRequest = function resolveAgainstRequest(
	url: string,
	headers: Headers,
	requestURL?: string
): string | null {
	if (requestURL) {
		try {
			const parsed = new URL(requestURL);
			return resolveBackendURL(url, {
				host: parsed.host,
				'x-forwarded-proto': parsed.protocol.replace(':', ''),
			});
		} catch {
			return null;
		}
	}
	const host = headers.get('host');
	return host ? resolveBackendURL(url, { host }) : null;
};

/**
 * Whether the consent cookie may travel to this backend.
 *
 * HTTPS always may. Plain HTTP only where the request never really leaves
 * the machine — a loopback backend, or a dev server serving the page over
 * the same plain-HTTP origin — so a downgraded or cross-origin `http://`
 * backend never receives the visitor's cookies in the clear.
 */
const mayForwardCookie = function mayForwardCookie(
	absolute: string,
	requestURL?: string
): boolean {
	let target: URL;
	try {
		target = new URL(absolute);
	} catch {
		return false;
	}
	if (target.protocol === 'https:') {
		return true;
	}
	if (LOOPBACK_HOSTS.has(target.hostname)) {
		return true;
	}
	if (!requestURL) {
		return false;
	}
	try {
		const from = new URL(requestURL);
		return from.protocol === 'http:' && from.host === target.host;
	} catch {
		return false;
	}
};

/**
 * Builds the headers the server-side `/init` call carries.
 *
 * Only the consent cookie is replayed, never the visitor's whole jar: the
 * backend needs the stored decision and nothing else, and a hosted backend
 * is a different origin the site's session cookies have no business
 * reaching. `allowCookie` drops even that one when the hop would be in the
 * clear.
 */
const INIT_HEADER_ALLOWLIST = new Set<string>(CONSENT_REQUEST_HEADER_NAMES);

/**
 * The descriptor's configured init headers, normalized and allowlisted.
 *
 * The core hosted transport applies these to the browser's own `/init`
 * call. The server prefetch has to apply the same ones, or a configured
 * `x-c15t-country` resolves one policy on the server and another in the
 * browser, and hydration corrects a banner the server already painted.
 */
const configuredInitHeaders = function configuredInitHeaders(
	headers: Record<string, string> | undefined
): Record<string, string> {
	const allowed: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers ?? {})) {
		const normalized = name.toLowerCase();
		if (INIT_HEADER_ALLOWLIST.has(normalized)) {
			allowed[normalized] = value;
		}
	}
	return allowed;
};

const forwardHeaders = function forwardHeaders(
	headers: Headers,
	overrides: KernelOverrides,
	options: { cookieName: string; allowCookie?: boolean }
): Record<string, string> {
	const forward: Record<string, string> = { accept: 'application/json' };
	const cookie = headers.get('cookie');
	const scoped =
		cookie && options.allowCookie !== false
			? filterCookieHeader(cookie, [options.cookieName])
			: undefined;
	if (scoped) {
		forward.cookie = scoped;
	}
	if (overrides.country) {
		forward['x-c15t-country'] = overrides.country;
	}
	if (overrides.region) {
		forward['x-c15t-region'] = overrides.region;
	}
	if (overrides.language) {
		forward['accept-language'] = overrides.language;
	}
	if (overrides.gpc !== undefined) {
		forward['sec-gpc'] = overrides.gpc ? '1' : '0';
	}
	return forward;
};

const prefetchHosted = async function prefetchHosted(input: {
	base: KernelConfig;
	backendURL: string;
	headers: Headers;
	configuredHeaders?: Record<string, string>;
	options: C15tResolvedOptions;
	url?: string;
	fetch?: typeof globalThis.fetch;
}): Promise<KernelConfig> {
	const absolute = resolveAgainstRequest(
		input.backendURL,
		input.headers,
		input.url
	);
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!absolute || !fetchImpl) {
		return input.base;
	}
	const allowCookie = mayForwardCookie(absolute, input.url);
	try {
		const response = await fetchImpl(`${absolute}/init`, {
			cache: 'no-store',
			credentials: allowCookie ? 'include' : 'omit',
			headers: {
				...forwardHeaders(input.headers, input.base.initialOverrides ?? {}, {
					allowCookie,
					cookieName: consentCookieName(input.options),
				}),
				// Configured headers win, matching the core transport's own
				// precedence on the browser's `/init`.
				...configuredInitHeaders(input.configuredHeaders),
			},
			method: 'GET',
		});
		if (!response.ok) {
			return input.base;
		}
		const payload = (await response.json()) as InitOutput;
		return mergeInitOutputIntoKernelConfig(input.base, payload);
	} catch {
		// Silent degradation: the browser retries on boot.
		return input.base;
	}
};

interface PrefetchLocalInput {
	base: KernelConfig;
	options: C15tResolvedOptions;
	inputs: ConsentRequestHeaderInputs;
	translations: KernelTranslations;
	headers: Headers;
	url?: string;
	fetch?: typeof globalThis.fetch;
}

const prefetchManifest = async function prefetchManifest(
	input: PrefetchLocalInput,
	mode: Extract<C15tResolvedOptions['mode'], { type: 'manifest' }>
): Promise<KernelConfig> {
	const absoluteBackend = mode.backendURL
		? (resolveAgainstRequest(mode.backendURL, input.headers, input.url) ??
			undefined)
		: undefined;
	const absoluteManifest = mode.manifestURL
		? (resolveAgainstRequest(mode.manifestURL, input.headers, input.url) ??
			undefined)
		: undefined;
	const cookieTarget = absoluteManifest ?? absoluteBackend;
	const transport = createManifestTransport({
		backendURL: absoluteBackend,
		baseTranslations,
		fetch: input.fetch,
		headers: forwardHeaders(input.headers, input.base.initialOverrides ?? {}, {
			allowCookie: cookieTarget
				? mayForwardCookie(cookieTarget, input.url)
				: false,
			cookieName: consentCookieName(input.options),
		}),
		inputs: input.inputs,
		manifest: mode.manifest,
		manifestURL: absoluteManifest,
	});
	try {
		const response = await transport.init?.({
			overrides: input.base.initialOverrides ?? {},
			user: input.base.initialUser ?? null,
		});
		return response
			? mergeInitResponseIntoKernelConfig(input.base, response)
			: input.base;
	} catch {
		return input.base;
	}
};

const prefetchOffline = async function prefetchOffline(
	input: PrefetchLocalInput
): Promise<KernelConfig> {
	const { options } = input;
	// `createOfflineTransport` reads the length, not the presence: an empty
	// array means "no pack applies", and passing it as configured would leave
	// the wide opt-in policy in place while the transport narrows.
	const policyPacks =
		options.mode.type === 'offline' ? options.mode.policyPacks : undefined;
	const transport = createOfflineTransport({
		policyPacks:
			policyPacks && policyPacks.length > 0 ? policyPacks : undefined,
		translations: input.translations,
	});
	try {
		const response = await transport.init?.({
			overrides: input.base.initialOverrides ?? {},
			user: input.base.initialUser ?? null,
		});
		if (!response) {
			return input.base;
		}
		// Without policy packs the offline transport resolves a policy that
		// allows every category. Narrow it to what the site configured: the
		// React dialog reads its toggle list off the policy, so leaving it
		// wide showed categories the site never asked for while the Svelte
		// and Vue surfaces — which filter by option — did not.
		const policy = policyPacks
			? response.policy
			: (buildInlineOfflinePolicy(options.consentCategories) ??
				response.policy);
		return mergeInitResponseIntoKernelConfig(input.base, {
			...response,
			policy,
		});
	} catch {
		return input.base;
	}
};

const prefetchLocal = function prefetchLocal(
	input: PrefetchLocalInput
): Promise<KernelConfig> {
	const { mode } = input.options;
	return mode.type === 'manifest'
		? prefetchManifest(input, mode)
		: prefetchOffline(input);
};

/**
 * Derive the kernel snapshot the server would hand a freshly booted page.
 *
 * Kernel construction is pure — no DOM, no network, no storage — so this is
 * safe to run per request.
 *
 * @param config - The resolved kernel configuration.
 * @returns The snapshot, including derived `activeUI` and policy UI hints.
 */
export const snapshotFromConfig = function snapshotFromConfig(
	config: KernelConfig
): ConsentSnapshot {
	const kernel = createConsentKernel(config);
	const snapshot = kernel.getServerSnapshot();
	kernel.dispose();
	return snapshot;
};

/**
 * Resolve everything the page needs about consent for one request.
 *
 * Reads the consent cookie and the geo/GPC headers, prefetches the policy
 * decision through the configured mode, and derives whether the banner
 * should render server-side.
 *
 * @param input - Request headers and integration options.
 * @returns The value the middleware stores on `Astro.locals.c15t`.
 * @example
 * ```ts
 * const c15t = await resolveConsentContext({ headers: request.headers, options });
 * ```
 */
export const resolveConsentContext = async function resolveConsentContext(
	input: ResolveConsentContextOptions
): Promise<C15tLocals> {
	const { headers, options } = input;
	const { config: base, inputs } = readInitialConsentConfig(headers, options);
	const translations = resolveTranslations(options, inputs);

	let config: KernelConfig = { ...base, initialTranslations: translations };
	if (!input.skipPrefetch) {
		config =
			options.mode.type === 'hosted'
				? await prefetchHosted({
						backendURL: options.mode.url,
						base: config,
						configuredHeaders: options.mode.headers,
						fetch: input.fetch,
						headers,
						options,
						url: input.url,
					})
				: await prefetchLocal({
						base: config,
						fetch: input.fetch,
						headers,
						inputs,
						options,
						translations,
						url: input.url,
					});
	}

	const snapshot = snapshotFromConfig(config);
	return {
		config,
		decision: snapshot.policyDecision ?? null,
		inputs,
		options,
		shouldShowBanner: snapshot.activeUI === 'banner',
		snapshot,
	};
};

/**
 * Build the inline `<script>` body that hands the browser its boot payload.
 *
 * The payload is the already-resolved `KernelConfig`, not a fetch: the
 * browser starts with the same decision the server rendered, so there is no
 * network init per page and no banner flicker.
 *
 * @param config - The resolved kernel configuration.
 * @returns JavaScript safe for inline `<script>` injection.
 */
export const buildConfigScript = function buildConfigScript(
	config: KernelConfig
): string {
	// `<` is escaped so a translation string can never close the script tag.
	const json = JSON.stringify(config ?? {}).replace(/</gu, '\\u003c');
	return `window.__c15tAstroConfig=${json};`;
};

export { buildPrefetchScript } from '@c15t/core';
export type { KernelConfig } from '@c15t/core';

/**
 * The per-request identity the emission guard keys off — in practice
 * `Astro.locals`, which Astro creates fresh for every request.
 */
export interface ConfigEmissionScope {
	c15t?: C15tLocals;
}

const emitted = new WeakSet<ConfigEmissionScope>();

/**
 * Claim the one-per-request emission of the inline config script.
 *
 * `<ConsentScript />` and `<ConsentBanner />` both want to inline the boot
 * payload, and a page may well contain both. The first caller for a given
 * request wins; every later caller renders nothing.
 *
 * @param locals - The current `Astro.locals`, used as the request identity.
 * @returns `true` for the first caller of this request.
 */
export const markConfigEmitted = function markConfigEmitted(
	locals: ConfigEmissionScope
): boolean {
	if (emitted.has(locals)) {
		return false;
	}
	emitted.add(locals);
	return true;
};
