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
import { readStoredConsentFromCookie } from '@c15t/core/modules/persistence';
import { createManifestTransport } from '@c15t/core/transports/manifest';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
	resolveBackendURL,
} from '@c15t/schema/types';
import type {
	ConsentRequestHeaderInputs,
	InitOutput,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import type { C15tLocals, C15tResolvedOptions } from './types';

/** Input for {@link resolveConsentContext}. */
export interface ResolveConsentContextOptions {
	/** The incoming request headers. */
	headers: Headers;
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
	const catalogue = defaultTranslationConfig.translations as Record<
		string,
		TranslationsResponse
	>;
	const base =
		catalogue[language] ??
		(catalogue.en as TranslationsResponse) ??
		({} as TranslationsResponse);
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

const forwardHeaders = function forwardHeaders(
	headers: Headers,
	overrides: KernelOverrides
): Record<string, string> {
	const forward: Record<string, string> = { accept: 'application/json' };
	const cookie = headers.get('cookie');
	if (cookie) {
		forward.cookie = cookie;
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
	fetch?: typeof globalThis.fetch;
}): Promise<KernelConfig> {
	const absolute = resolveBackendURL(input.backendURL, input.headers);
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!absolute || !fetchImpl) {
		return input.base;
	}
	try {
		const response = await fetchImpl(`${absolute}/init`, {
			cache: 'no-store',
			credentials: 'include',
			headers: forwardHeaders(input.headers, input.base.initialOverrides ?? {}),
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

const prefetchLocal = async function prefetchLocal(input: {
	base: KernelConfig;
	options: C15tResolvedOptions;
	inputs: ConsentRequestHeaderInputs;
	translations: KernelTranslations;
	headers: Headers;
	fetch?: typeof globalThis.fetch;
}): Promise<KernelConfig> {
	const { options } = input;
	if (options.mode.type === 'manifest') {
		const absoluteBackend = options.mode.backendURL
			? (resolveBackendURL(options.mode.backendURL, input.headers) ?? undefined)
			: undefined;
		const absoluteManifest = options.mode.manifestURL
			? (resolveBackendURL(options.mode.manifestURL, input.headers) ??
				undefined)
			: undefined;
		const transport = createManifestTransport({
			backendURL: absoluteBackend,
			baseTranslations,
			fetch: input.fetch,
			headers: forwardHeaders(input.headers, input.base.initialOverrides ?? {}),
			inputs: input.inputs,
			manifest: options.mode.manifest,
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
	}

	const transport = createOfflineTransport({
		policyPacks:
			options.mode.type === 'offline' ? options.mode.policyPacks : undefined,
		translations: input.translations,
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
						fetch: input.fetch,
						headers,
					})
				: await prefetchLocal({
						base: config,
						fetch: input.fetch,
						headers,
						inputs,
						options,
						translations,
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
