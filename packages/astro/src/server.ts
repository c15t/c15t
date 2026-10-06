import {
	seedExperiment,
	applyTranslationOverrides,
	createConsentKernel,
	defaultTranslationConfig,
} from '@c15t/core';
import type {
	ConsentSnapshot,
	KernelConfig,
	KernelTranslations,
	TranslationOverrides,
	TranslationsResponse,
} from '@c15t/core';
/**
 * Server helpers for `@c15t/astro`.
 *
 * These run inside the Astro middleware and the injected API routes. They
 * read the incoming request, resolve the consent decision for it through
 * `resolveRequestConsent` from `@c15t/core/server` (shared with every other
 * adapter), and produce the `KernelConfig` the page inlines so the browser
 * boots without an `/init` roundtrip. Translations, the offline vendor
 * list, the snapshot and the banner flags stay Astro's own.
 */
import { resolveStorageKeys } from '@c15t/core/modules/persistence';
import { inferConsentCategories, isIABConfigured } from '@c15t/core/runtime';
import {
	fetchCachedGvl,
	readRequestConsent,
	resolveRenderBudgetMs,
	resolveRequestConsent,
} from '@c15t/core/server';
import type {
	ManifestFetch,
	ResolveRequestConsentOptions,
} from '@c15t/core/server';
import { hasConsentUI } from '@c15t/core/surface-actions';
import {
	DEFAULT_RESOLVE_TIMEOUT_MS,
	withResolutionBudget,
} from '@c15t/core/transports/manifest-cache';
import type {
	ConsentRequestHeaderInputs,
	GlobalVendorList,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';
import { generateThemeCSS } from '@c15t/ui/theme';
import type { Theme } from '@c15t/ui/theme';

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
	/**
	 * This request's experiment arm, resolved by the middleware's
	 * `experimentArm`. Overrides a static `experiment.arm`.
	 */
	experimentArm?: string;
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
	 * `middleware.timeoutMs` from the integration options. `false` (or
	 * `Infinity`) waits however long the backend takes; any other value that
	 * is not a finite, non-negative number uses the default.
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
 * `middleware.timeoutMs` says otherwise: core's default.
 */
export { DEFAULT_RESOLVE_TIMEOUT_MS };

/**
 * The integration's `i18n.messages`, typed as overrides. The option is
 * serializable and typed loosely; the shape is the same.
 */
const readTranslationOverrides = function readTranslationOverrides(
	options: C15tResolvedOptions
): TranslationOverrides | undefined {
	return options.i18n?.messages as TranslationOverrides | undefined;
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
	// A regional locale such as `de-AT` uses its primary language's bundle,
	// the same fallback the app's messages get.
	const primary = language.split('-')[0]?.toLowerCase();
	const base =
		(Object.hasOwn(catalogue, language) ? catalogue[language] : undefined) ??
		(primary && Object.hasOwn(catalogue, primary)
			? catalogue[primary]
			: undefined) ??
		(defaultTranslationConfig.translations.en as TranslationsResponse);
	return applyTranslationOverrides(
		{ language, translations: base },
		readTranslationOverrides(options)
	);
};

/**
 * How the configured mode resolves through `resolveRequestConsent`. A
 * relative URL resolves against the request URL only, never a forwarded
 * header: the adapter builds `Request.url` from the deployment's own proxy
 * configuration.
 */
const modeOptions = function modeOptions(
	options: C15tResolvedOptions,
	translations: KernelTranslations,
	fetch: typeof globalThis.fetch | undefined
): Partial<ResolveRequestConsentOptions> {
	const { mode } = options;
	switch (mode.type) {
		case 'hosted':
			return {
				backendURL: mode.url,
				// The browser's own `/init` carries these; so does the render's,
				// or server and browser resolve different policies.
				initHeaders: mode.headers,
				mode: 'hosted',
			};
		case 'manifest':
			return {
				backendURL: mode.backendURL,
				// The init route serves only lists from the shared cache; a
				// caller's own fetch keeps its list inline.
				gvlRoute: fetch ? undefined : options.endpoints.initPath,
				manifest: mode.manifest,
				manifestURL: mode.manifestURL,
				mode: 'manifest',
				reportSessions: mode.reportSessions,
			};
		default:
			return {
				mode: 'offline',
				offline: {
					// Same reason as the client factory in `mode.ts`: a pack whose
					// model is `iab` needs a configured CMP to be eligible.
					iabEnabled: isIABConfigured(options.iab),
					policyRules: mode.policyRules,
					translations,
				},
			};
	}
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
 * The experiment this request runs. The arm is known on the server, so the
 * inlined config and the first HTML already carry it. The banner is
 * server-rendered, so without an arm for this request no experiment runs
 * rather than holding the prompt. A prerendered page runs none.
 */
const resolveExperiment = function resolveExperiment(
	input: ResolveConsentContextOptions,
	prerendered: boolean
) {
	const { experiment: configured } = input.options;
	const arm = prerendered
		? undefined
		: (input.experimentArm ?? configured?.arm);
	const experiment =
		configured && arm !== undefined ? { ...configured, arm } : undefined;
	return {
		experiment,
		seeded: experiment
			? seedExperiment(experiment).initialExperiment
			: undefined,
	};
};

/** Waits for work the render stopped waiting for, swallowing its outcome. */
const settle = async function settle(task: Promise<unknown>): Promise<void> {
	try {
		await task;
	} catch {
		// Nothing waits on this result.
	}
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
	const startedAt = Date.now();
	const timeoutMs =
		input.timeoutMs ??
		options.middleware?.timeoutMs ??
		DEFAULT_RESOLVE_TIMEOUT_MS;
	const facts = {
		adapter: '@c15t/astro',
		// An explicit `i18n.locale` outranks Accept-Language negotiation.
		overrides: { language: options.i18n?.locale },
		// The injected routes: a render never fetches them over the network.
		ownRoutes: [options.endpoints.initPath, options.endpoints.manifestPath],
		request: { headers: input.headers, url: input.url },
		// A prerendered page is one HTML file for every visitor.
		shared: prerendered,
		storage: options.storageConfig,
	} satisfies ResolveRequestConsentOptions;
	const { inputs } = readRequestConsent(facts);
	const translations = resolveTranslations(options, inputs);
	const { experiment, seeded } = resolveExperiment(input, prerendered);

	const { experiment: _carried, ...resolved } = await resolveRequestConsent({
		...facts,
		...modeOptions(options, translations, input.fetch),
		experiment: seeded ? experiment : undefined,
		fetch: input.fetch,
		request: { ...facts.request, inputs },
		seed: {
			initialPolicyPending: true,
			initialTranslations: translations,
			...(seeded && { initialExperiment: seeded }),
		},
		timeoutMs,
		waitUntil: input.onBackgroundRevalidate,
	});
	let config: KernelConfig = resolved;

	// One deadline for the whole resolution, so a slow policy request and a
	// slow vendor list cannot each spend a full budget.
	const totalMs = resolveRenderBudgetMs(timeoutMs);
	const budgetMs =
		totalMs === undefined
			? undefined
			: Math.max(0, totalMs - (Date.now() - startedAt));
	const withGvl = withResolvedGvl({
		config,
		fetch: input.fetch,
		language: translations.language.split('-')[0] || 'en',
		options,
	});
	try {
		config = await withResolutionBudget(withGvl, budgetMs);
	} catch {
		// The list keeps filling the cache for the next render.
		input.onBackgroundRevalidate?.(settle(withGvl));
	}

	config.initialPolicyPending = config.initialPolicyResolution === undefined;
	// Hosted and manifest mode replace the copy with the backend's. It is the
	// base for that language; the app's own messages still win key by key.
	if (config.initialTranslations) {
		config.initialTranslations = applyTranslationOverrides(
			config.initialTranslations,
			readTranslationOverrides(options)
		);
	}
	// Judge the visitor against the categories the browser runtime will ask
	// about. The page's config leaves them out: the runtime derives them from
	// the same options.
	const snapshot = snapshotFromConfig({
		...config,
		consentCategories: options.consentCategories,
		// Code-declared vendors make their categories selectable in the
		// browser runtime, so the server asks about them too.
		inferredConsentCategories: inferConsentCategories(options, [
			...(options.vendors ?? []),
			...(config.initialVendors?.declared ?? []),
		]),
	});
	return {
		// A prerendered config carries no stored records, clock or privacy
		// signal: any `initialRecords` at all stop the browser reading the
		// visitor's cookie, and a build-time `now` would age every record.
		// The snapshot is the one a first-time visitor gets.
		config,
		decision: snapshot.resolution,
		hasConsentUi: hasConsentUI(snapshot),
		hasPolicy: snapshot.resolution.status === 'matched',
		inputs,
		options,
		prerendered,
		shouldShowBanner: !snapshot.policyPending && snapshot.activeUI === 'banner',
		snapshot,
	};
};

/**
 * Build the boot payload as JSON for a data block.
 *
 * The components render it as
 * `<script type="application/json" data-c15t-config>`, which the browser
 * never runs. A Content Security Policy does not govern a data block, so a
 * policy that allows inline scripts only by hash or nonce still lets the
 * payload through, even though it changes per visitor.
 *
 * @param config - The resolved kernel configuration.
 * @returns JSON safe to place inside a `<script>` element.
 * @example
 * ```astro
 * <script
 *   is:inline
 *   type="application/json"
 *   data-c15t-config
 *   set:html={buildConfigJSON(Astro.locals.c15t.config)}
 * />
 * ```
 */
export const buildConfigJSON = function buildConfigJSON(
	config: KernelConfig
): string {
	// `<` is escaped so a translation string can never close the script tag.
	return JSON.stringify(config ?? {}).replace(/</gu, '\\u003c');
};

/**
 * Build the inline `<script>` body that hands the browser its boot payload.
 *
 * The payload is the already-resolved `KernelConfig`, not a fetch: the
 * browser starts with the same decision the server rendered, so there is no
 * network init per page and no banner flicker.
 *
 * The components use {@link buildConfigJSON} instead. This form runs, so a
 * Content Security Policy has to allow it; it changes per visitor, so only
 * a nonce or `'unsafe-inline'` can. Put the nonce on the script: the
 * browser runtime reads it from there for the scripts and stylesheets it
 * adds.
 *
 * @param config - The resolved kernel configuration.
 * @returns JavaScript safe for inline `<script>` injection.
 */
export const buildConfigScript = function buildConfigScript(
	config: KernelConfig
): string {
	return `window.__c15tAstroConfig=${buildConfigJSON(config)};`;
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
