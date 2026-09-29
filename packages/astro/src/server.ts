import {
	assignExperimentVariant,
	deferInitGvl,
	deferInitGvlToRoute,
	c15tProtocolHeaders,
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
/**
 * Server helpers for `@c15t/astro`.
 *
 * These run inside the Astro middleware and the injected API routes. They
 * read the incoming request, resolve the consent decision for it, and
 * produce the `KernelConfig` the page inlines so the browser boots without
 * an `/init` roundtrip.
 */
import {
	CONSENT_STORAGE_KEY,
	readStoredRecordsFromCookieHeader,
	resolveStorageKeys,
} from '@c15t/core/modules/persistence';
import { inferConsentCategories, isIABConfigured } from '@c15t/core/runtime';
import { fetchCachedGvl } from '@c15t/core/server';
import type { ManifestFetch } from '@c15t/core/server';
import { readProducerPolicyContract } from '@c15t/core/transports';
import {
	consentInputsToOverrides,
	CONSENT_REQUEST_HEADER_NAMES,
	extractConsentRequestInputs,
	resolveBackendURL,
} from '@c15t/schema/types';
import type {
	ConsentRequestHeaderInputs,
	GlobalVendorList,
	InitOutput,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';
import { generateThemeCSS } from '@c15t/ui/theme';
import type { Theme } from '@c15t/ui/theme';

import {
	loadConsentManifest,
	resolveManifestInit,
	resolveSessionReportURL,
} from './api/manifest-init';
import { filterCookieHeader } from './libs/cookies';
import type { C15tColorScheme, C15tLocals, C15tResolvedOptions } from './types';

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
	 * Render once for every visitor, as a prerendered route does.
	 *
	 * `headers` is ignored, and the config carries no stored consent, clock
	 * or privacy signal: those belong to whoever is building the site, and
	 * the browser would otherwise prefer them over the visitor's own cookie.
	 * Offline mode still resolves its policy, because it resolves without
	 * request inputs in the browser too. Hosted and manifest mode are left
	 * pending for the browser to resolve.
	 */
	prerendered?: boolean;
	/**
	 * Receives the promise of a background manifest revalidation started by
	 * this render, so the host can keep it alive past the response on
	 * runtimes that stop detached work once a response is sent. The
	 * middleware passes the adapter's `waitUntil` from `locals.cfContext`
	 * (Astro 6 and later) or `locals.runtime.ctx` (Astro 5)
	 * when there is one. The promise never rejects.
	 *
	 * It also receives a manifest request the render stopped waiting for
	 * when {@link ResolveConsentContextOptions.timeoutMs} ran out.
	 */
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;
	/**
	 * Longest to wait for the backend, in milliseconds. Overrides
	 * `middleware.timeoutMs` from the integration options. `false` waits
	 * however long the backend takes.
	 *
	 * When it runs out, the result is what a failed request gives: no
	 * server decision, `hasPolicy: false`, and the browser resolves the
	 * policy on boot.
	 *
	 * @default 500
	 */
	timeoutMs?: number | false;
}

/**
 * How long a server render waits for the visitor's policy unless
 * `middleware.timeoutMs` says otherwise.
 */
export const DEFAULT_RESOLVE_TIMEOUT_MS = 500;

const TIMED_OUT: unique symbol = Symbol('c15t.resolution-timeout');

/**
 * The render budget in milliseconds, or `undefined` for none.
 *
 * @param input - The resolution input.
 * @returns A non-negative budget, or `undefined` when disabled.
 */
const resolveBudgetMs = function resolveBudgetMs(
	input: ResolveConsentContextOptions
): number | undefined {
	const configured =
		input.timeoutMs ??
		input.options.middleware?.timeoutMs ??
		DEFAULT_RESOLVE_TIMEOUT_MS;
	if (configured === false || !Number.isFinite(configured)) {
		return undefined;
	}
	return Math.max(0, configured);
};

/**
 * Settle with the task, or with {@link TIMED_OUT} once `remainingMs` passes.
 * The task itself keeps running.
 *
 * @param task - Work that never rejects.
 * @param remainingMs - Time left, or `undefined` for no limit.
 * @returns The task's value, or `TIMED_OUT`.
 */
const raceBudget = async function raceBudget<Value>(
	task: Promise<Value>,
	remainingMs: number | undefined
): Promise<Value | typeof TIMED_OUT> {
	if (remainingMs === undefined) {
		return await task;
	}
	let timer: ReturnType<typeof setTimeout> | undefined;
	// oxlint-disable-next-line promise/avoid-new -- Bridges a timer into the race.
	const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
		timer = setTimeout(() => resolve(TIMED_OUT), remainingMs);
	});
	try {
		return await Promise.race([task, timeout]);
	} finally {
		clearTimeout(timer);
	}
};

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
 * The request-only part of {@link resolveConsentContext}: cookies and geo
 * headers read into a baseline `KernelConfig`.
 *
 * Does no network work and sets no cookies, so it is safe on every runtime
 * including static prerenders.
 *
 * @param headers - The incoming request headers.
 * @param options - The integration options.
 * @returns A config seeded with stored consent and request overrides.
 */
const readConsentRequest = function readConsentRequest(
	headers: Headers,
	options: C15tResolvedOptions
): { config: KernelConfig; inputs: ConsentRequestHeaderInputs } {
	const now = Date.now();
	const initialRecords = readStoredRecordsFromCookieHeader(
		headers.get('cookie') ?? undefined,
		options.storageConfig,
		now
	);
	// An explicit `i18n.locale` outranks Accept-Language negotiation.
	const inputs = extractConsentRequestInputs(headers, {
		language: options.i18n?.locale,
	});

	const config: KernelConfig = {
		initialPolicyPending: true,
		initialPrivacySignals: { gpc: inputs.gpc },
		initialRecords,
		now,
	};
	// The arm is known on the server, so the inlined config and the first
	// HTML already carry it. `resolveOptions()` rejects an experiment
	// without a `variant`; the guard keeps a hand-built options object safe.
	if (options.experiment?.variant !== undefined) {
		config.initialExperiment = assignExperimentVariant(options.experiment, '');
	}
	const overrides = consentInputsToOverrides({
		country: inputs.country,
		language: inputs.language,
		region: inputs.region,
	}) as KernelOverrides;
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
	const forward: Record<string, string> = {
		...c15tProtocolHeaders,
		accept: 'application/json',
	};
	const detectedGpc = headers.get('sec-gpc');
	if (detectedGpc !== null) {
		forward['sec-gpc'] = detectedGpc;
	}
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
		forward['x-c15t-gpc'] = overrides.gpc ? '1' : '0';
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
	timeoutMs?: number;
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
	const forwarded = {
		...forwardHeaders(input.headers, input.base.initialOverrides ?? {}, {
			allowCookie,
			cookieName: consentCookieName(input.options),
		}),
		...configuredInitHeaders(input.configuredHeaders),
	};
	try {
		const response = await fetchImpl(`${absolute}/init`, {
			cache: 'no-store',
			credentials: allowCookie ? 'include' : 'omit',
			headers: forwarded,
			method: 'GET',
			// `/init` answers one visitor and is never cached, so a request
			// the render gave up on has nothing left to deliver.
			signal:
				input.timeoutMs === undefined
					? undefined
					: AbortSignal.timeout(input.timeoutMs),
		});
		if (!response.ok) {
			return input.base;
		}
		const payload = (await response.json()) as InitOutput;
		return mergeInitOutputIntoKernelConfig(
			input.base,
			input.fetch || forwarded.cookie
				? payload
				: deferInitGvl(payload, `${absolute}/init`, 'init', forwarded),
			{},
			{
				producerContract: readProducerPolicyContract(response.headers),
			}
		);
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
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;
	/** Whether the render stopped waiting for this prefetch. */
	abandoned?: () => boolean;
}

const prefetchManifest = async function prefetchManifest(
	input: PrefetchLocalInput,
	mode: Extract<C15tResolvedOptions['mode'], { type: 'manifest' }>
): Promise<KernelConfig> {
	// Deliberately not `createManifestTransport`: its manifest memo lives
	// on the transport instance, and a render builds a fresh one, so every
	// page view paid a manifest fetch. The route handlers already go
	// through the process-wide cache in `@c15t/core/server`; so does this,
	// which is what makes the second render cost nothing.
	const source = { headers: input.headers, url: input.url };
	const target = mode.manifestURL ?? mode.backendURL;
	const absoluteTarget = target
		? resolveAgainstRequest(target, input.headers, input.url)
		: null;
	try {
		const manifest = await loadConsentManifest({
			fetch: input.fetch as ManifestFetch | undefined,
			onBackgroundRevalidate: input.onBackgroundRevalidate,
			options: input.options,
			source,
		});
		const payload = await resolveManifestInit({
			fetch: input.fetch as ManifestFetch | undefined,
			fetchGvl: async ({ reference, language, fetch: fetchImpl }) =>
				await fetchCachedGvl({
					fetch: fetchImpl,
					language,
					url: reference.url,
				}),
			inputs: input.inputs,
			manifest,
			report: {
				abandoned: input.abandoned,
				backendURL: resolveSessionReportURL(input.options),
				headers: input.headers,
				source: 'render',
				waitUntil: input.onBackgroundRevalidate,
			},
		});
		return mergeInitOutputIntoKernelConfig(
			input.base,
			// This loader only caches the public list; caller fetches stay inline.
			!input.fetch && manifest.iab?.gvl
				? deferInitGvlToRoute(payload, input.options.endpoints.initPath)
				: payload,
			forwardHeaders(input.headers, input.base.initialOverrides ?? {}, {
				allowCookie: absoluteTarget
					? mayForwardCookie(absoluteTarget, input.url)
					: false,
				cookieName: consentCookieName(input.options),
			})
		);
	} catch {
		return input.base;
	}
};

const prefetchOffline = async function prefetchOffline(
	input: PrefetchLocalInput
): Promise<KernelConfig> {
	const { options } = input;
	const policyRules =
		options.mode.type === 'offline' ? options.mode.policyRules : undefined;
	const transport = createOfflineTransport({
		// Same reason as the client factory in `mode.ts`: a pack whose model
		// is `iab` needs a configured CMP to be eligible.
		iabEnabled: isIABConfigured(options.iab),
		policyRules,
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
		return mergeInitResponseIntoKernelConfig(input.base, response);
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
 * Fold a vendor list into the config when the prefetch did not supply one.
 *
 * Hosted and manifest mode get theirs from `/init`. Offline mode has no
 * backend to ask, so a site that wants a server-rendered IAB banner points
 * `iab.gvl` at a list or `iab.gvlURL` at where one lives — the second goes
 * through the shared in-process cache, so a page render is not a download.
 *
 * A failed fetch is not fatal: the page falls back to the non-IAB banner
 * and the browser retries on boot.
 *
 * @param input - The prefetched config plus the integration options.
 * @returns The config, with `initialIab` populated when a list resolved.
 */
const withResolvedGvl = async function withResolvedGvl(input: {
	config: KernelConfig;
	options: C15tResolvedOptions;
	language: string;
	fetch?: typeof globalThis.fetch;
}): Promise<KernelConfig> {
	const { iab } = input.options;
	if (!(isIABConfigured(iab) && iab)) {
		return input.config;
	}
	if (input.config.initialIab?.gvl || input.config.initialIab?.gvlReference) {
		return input.config;
	}

	let gvl: GlobalVendorList | null = iab.gvl ?? null;
	if (!gvl && iab.gvlURL) {
		try {
			gvl = await fetchCachedGvl({
				fetch: input.fetch as ManifestFetch | undefined,
				language: input.language,
				url: iab.gvlURL,
			});
		} catch {
			gvl = null;
		}
	}
	if (!gvl) {
		return input.config;
	}

	return {
		...input.config,
		initialIab: {
			...(input.config.initialIab ?? {}),
			cmpId: input.config.initialIab?.cmpId ?? iab.cmpId ?? null,
			enabled: true,
			gvl,
		},
	};
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
 * Drop the parts of a config that describe one visitor.
 *
 * @param config - A config resolved without a visitor's request.
 * @returns The config minus stored records, clock and privacy signals.
 */
const withoutVisitorState = function withoutVisitorState(
	config: KernelConfig
): KernelConfig {
	const {
		initialPrivacySignals: _signals,
		initialRecords: _records,
		now: _now,
		...shared
	} = config;
	return shared;
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
	const { options } = input;
	const prerendered = input.prerendered === true;
	const headers = prerendered ? new Headers() : input.headers;
	const { config: base, inputs } = readConsentRequest(headers, options);
	const translations = resolveTranslations(options, inputs);
	// Hosted and manifest mode resolve against the visitor's geo, which a
	// build has none of. Offline mode resolves without it in the browser as
	// well, so the build reaches the answer every visitor would.
	const skipPrefetch = prerendered && options.mode.type !== 'offline';
	// One deadline for the whole resolution, so a slow policy request and a
	// slow vendor list cannot each spend a full budget.
	const budgetMs = resolveBudgetMs(input);
	const startedAt = Date.now();
	const remainingMs = (): number | undefined =>
		budgetMs === undefined
			? undefined
			: Math.max(0, budgetMs - (Date.now() - startedAt));
	const keepAlive = (task: Promise<unknown>): void => {
		const settle = async (): Promise<void> => {
			try {
				await task;
			} catch {
				// The prefetch steps degrade on their own; nothing to report.
			}
		};
		input.onBackgroundRevalidate?.(settle());
	};

	let config: KernelConfig = { ...base, initialTranslations: translations };
	// Set once the render stops waiting for the prefetch. The browser then
	// resolves the view through the init route, which reports the session,
	// so the abandoned prefetch must not report it as well.
	let prefetchAbandoned = false;
	if (!skipPrefetch) {
		const prefetch =
			options.mode.type === 'hosted'
				? prefetchHosted({
						backendURL: options.mode.url,
						base: config,
						configuredHeaders: options.mode.headers,
						fetch: input.fetch,
						headers,
						options,
						timeoutMs: budgetMs,
						url: input.url,
					})
				: prefetchLocal({
						abandoned: () => prefetchAbandoned,
						base: config,
						fetch: input.fetch,
						headers,
						inputs,
						onBackgroundRevalidate: input.onBackgroundRevalidate,
						options,
						translations,
						url: input.url,
					});
		const settled = await raceBudget(prefetch, remainingMs());
		if (settled === TIMED_OUT) {
			// Render without the server decision, as a failed request does.
			// A manifest fill keeps going and serves the next render.
			prefetchAbandoned = true;
			keepAlive(prefetch);
		} else {
			config = settled;
		}
	}

	const withGvl = withResolvedGvl({
		config,
		fetch: input.fetch,
		language: translations.language.split('-')[0] || 'en',
		options,
	});
	const gvlSettled = await raceBudget(withGvl, remainingMs());
	if (gvlSettled === TIMED_OUT) {
		keepAlive(withGvl);
	} else {
		config = gvlSettled;
	}

	config.initialPolicyPending = config.initialPolicyResolution === undefined;
	// Judge the visitor against the categories the browser runtime will ask
	// about. The page's config leaves them out: the runtime derives them from
	// the same options.
	const snapshot = snapshotFromConfig({
		...config,
		consentCategories: options.consentCategories,
		inferredConsentCategories: inferConsentCategories(
			options,
			config.initialVendors?.declared
		),
	});
	return {
		// The snapshot above is the one a first-time visitor gets, which is
		// what the build renders. The config the page inlines drops it: any
		// `initialRecords` at all stop the browser reading the visitor's
		// cookie, and a build-time `now` would age every record against it.
		config: prerendered ? withoutVisitorState(config) : config,
		decision: snapshot.resolution,
		hasConsentUi:
			snapshot.resolution.status === 'matched' &&
			(snapshot.policyRule.prompt !== 'none' ||
				snapshot.policyRule.rights.length > 0),
		hasPolicy: snapshot.resolution.status === 'matched',
		inputs,
		options,
		prerendered,
		shouldShowBanner: !snapshot.policyPending && snapshot.activeUI === 'banner',
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

/**
 * Build the theme stylesheet for the configured theme tokens.
 *
 * The banner is server-rendered and the dialog islands no longer generate
 * theme CSS in the browser, so the server writes the `--c15t-*` variables
 * once, next to the config script. Dark tokens follow the `c15t-dark`
 * class the colour-scheme script sets.
 *
 * @param theme - The integration's theme option.
 * @returns CSS for a `<style>` element, or an empty string without a theme.
 * @example
 * ```astro
 * <style is:inline id="c15t-theme" set:html={buildThemeCSS(theme)} />
 * ```
 */
export const buildThemeCSS = function buildThemeCSS(
	theme: Theme | undefined
): string {
	return theme ? generateThemeCSS(theme) : '';
};

/**
 * Build the first-paint colour-scheme script.
 *
 * Dark mode is the `c15t-dark` class on `<html>`, and the client boot sets
 * it — but that runs after the stylesheet has already painted the
 * server-rendered banner in the light palette. This runs in `<head>`,
 * before the browser has anything to paint, so a system-dark visitor never
 * sees the flash. It is deliberately framework-free and unbundled: a
 * module script would be deferred and lose the race.
 *
 * `'light'` emits nothing. Light is the absence of the class, so there is
 * nothing to do before paint. `'none'` emits nothing either: the site owns
 * the class and sets it itself.
 *
 * @param colorScheme - The resolved colour scheme.
 * @returns Script source, or an empty string when none is needed.
 * @example
 * ```astro
 * <script is:inline set:html={buildColorSchemeScript('system')} />
 * ```
 */
export const buildColorSchemeScript = function buildColorSchemeScript(
	colorScheme: C15tColorScheme
): string {
	if (colorScheme === 'light' || colorScheme === 'none') {
		return '';
	}
	if (colorScheme === 'dark') {
		return "document.documentElement.classList.add('c15t-dark');";
	}
	// Wrapped because `matchMedia` is absent in some embedded webviews, and
	// a throw here would abort the rest of the document's parsing.
	return "try{document.documentElement.classList.toggle('c15t-dark',matchMedia('(prefers-color-scheme:dark)').matches)}catch(e){}";
};

/**
 * Build the script that shows a prerendered banner at first paint.
 *
 * A prerendered banner ships hidden, because the same HTML serves visitors
 * who have already chosen. The runtime shows it once it has read the
 * visitor's records, but that waits for the page's module scripts. This
 * runs inline right after the banner: a visitor with nothing stored under
 * any consent key cannot have chosen, so it shows the banner straight away.
 * Anyone with a stored record keeps waiting for the runtime, which
 * validates it.
 *
 * @param storageConfig - The integration's storage configuration.
 * @param testId - The banner's `data-testid` prefix.
 * @returns JavaScript safe for inline `<script>` injection.
 * @example
 * ```astro
 * <script is:inline set:html={buildBannerRevealScript(undefined, 'consent-banner')} />
 * ```
 */
export const buildBannerRevealScript = function buildBannerRevealScript(
	storageConfig: C15tResolvedOptions['storageConfig'],
	testId: 'consent-banner' | 'iab-consent-banner'
): string {
	const keys = resolveStorageKeys(storageConfig);
	const names = [keys.consent, keys.notice, keys.legacyConsent].filter(
		(name): name is string => Boolean(name)
	);
	// `<` is escaped so a storage key can never close the script tag.
	const json = JSON.stringify(names).replace(/</gu, '\\u003c');
	// An IIFE keeps its variables out of the page's global scope. Blocked
	// cookies or storage (sandboxes, some privacy modes) throw on access: each
	// is read as "nothing stored there" so the other still decides, and any
	// other throw is swallowed so it cannot abort the rest of the document.
	return `(function(){try{var names=${json},cookies=[],stored;try{cookies=document.cookie.split(';').map(function(p){return p.split('=')[0].trim()})}catch(e){}stored=function(n){if(cookies.indexOf(n)>=0)return true;try{return window.localStorage.getItem(n)!==null}catch(e){return false}};if(names.some(stored))return;var root=document.querySelector('[data-testid="${testId}-root"][hidden]'),overlay=document.querySelector('[data-testid="${testId}-overlay"][hidden]');if(root){root.hidden=false;root.setAttribute('data-c15t-visible','true');if(overlay)overlay.hidden=false}}catch(e){}})();`;
};

export { buildPrefetchScript } from '@c15t/core';
export {
	C15T_MARK_SVG,
	INTH_LOGO_SVG,
	resolveBrandingModel,
} from './banner/branding-model';
export type {
	BrandingModel,
	BrandingModelInput,
	BrandingVariant,
} from './banner/branding-model';
export { iabPromptClassNames, promptClassNames } from './banner/class-names';
export type {
	ClassNameMap,
	IABPromptClassNames,
	PromptClassNames,
} from './banner/class-names';
export { resolveIABPromptModel } from './banner/iab-prompt-model';
export type {
	IABAction,
	IABPromptButton,
	IABPromptModel,
	IABPromptModelInput,
	IABPromptProps,
} from './banner/iab-prompt-model';
export { joinClasses, resolvePromptModel } from './banner/prompt-model';
export {
	IAB_PROMPT_SLOT_ATTRIBUTE,
	PROMPT_SLOT_ATTRIBUTE,
} from './banner/slot';
export type {
	PromptAction,
	PromptModel,
	PromptModelInput,
	PromptProps,
} from './banner/prompt-model';
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
