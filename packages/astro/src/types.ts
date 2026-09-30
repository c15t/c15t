/**
 * Public option and locals types for `@c15t/astro`.
 *
 * Everything the integration accepts must survive `JSON.stringify`: the
 * options are serialized once at build time into a virtual module that the
 * middleware, the `.astro` components and the injected client boot script
 * all import. Callbacks and other live values belong in the module named
 * by {@link C15tAstroOptions.clientEntrypoint}.
 */

import type {
	AllConsentNames,
	ClearOnRevocationConfig,
	ConsentSnapshot,
	ConsentExperiment,
	ConsentPresentation,
	KernelConfig,
	LegalLinks,
	PublisherRestriction,
	Script,
	StorageConfig,
} from '@c15t/core';
import type {
	ConsentRuntimeOptions,
	RuntimeNetworkBlockerOptions,
} from '@c15t/core/runtime';
import type {
	PolicyRule,
	PolicyResolution,
	ConsentManifest,
	GlobalVendorList,
} from '@c15t/schema/types';
import type { Theme } from '@c15t/ui/theme';

/** Transport selection, in a form that survives serialization. */
export type C15tModeDescriptor =
	| C15tHostedDescriptor
	| C15tOfflineDescriptor
	| C15tManifestDescriptor;

/** Talk to a c15t backend over HTTP. */
export interface C15tHostedDescriptor {
	type: 'hosted';
	/** Backend base URL. Absolute, or same-origin like `/api/c15t`. */
	url: string;
	/** Domain recorded when consent is saved. */
	domain?: string;
	/** Extra headers forwarded to the backend. */
	headers?: Record<string, string>;
}

/** Resolve policies locally with no backend at all. */
export interface C15tOfflineDescriptor {
	type: 'offline';
	/** Policy packs resolved locally. */
	policyRules?: PolicyRule[];
}

/**
 * Resolve `/init` from a cached consent manifest.
 *
 * The server resolves the manifest per request; the browser talks to the
 * injected `/api/c15t/init` route, which is manifest-backed and cached.
 */
export interface C15tManifestDescriptor {
	type: 'manifest';
	/** `GET /manifest` URL. Defaults to `${backendURL}/manifest`. */
	manifestURL?: string;
	/** Backend base URL used for `POST /subjects`. */
	backendURL?: string;
	/** Inline manifest. Takes precedence over `manifestURL`. */
	manifest?: ConsentManifest;
	/**
	 * Report each init the server resolves, in the middleware and the init
	 * route, to the backend's `POST /sessions`, server-to-server and
	 * detached from the response, so the backend still counts visitors it
	 * never served `/init` to. Set `false` to send none.
	 *
	 * @default true
	 */
	reportSessions?: boolean;
}

/**
 * Which framework renders the on-demand dialog islands.
 *
 * Svelte is the default because it is the smallest: its runtime costs
 * roughly 14 KB gzipped against React's ~45 KB. A site already shipping
 * React or Vue should say so and reuse what it has instead of downloading
 * a second framework for one dialog. The choice is never inferred — a
 * silent change to what a page downloads is worse than an explicit one.
 */
export type C15tUIAdapterName = 'svelte' | 'react' | 'vue';

/**
 * How the consent surfaces pick light or dark.
 *
 * Dark mode is the `c15t-dark` class on `<html>`, not a
 * `prefers-color-scheme` block, so something has to set it. `'system'`
 * follows `prefers-color-scheme` and keeps following it; `'light'` and
 * `'dark'` pin it. `'none'` leaves the class to the site: c15t never adds
 * or removes it, so a site with its own theme switch toggles it itself.
 */
export type C15tColorScheme = 'light' | 'dark' | 'system' | 'none';

/** Route paths the integration can inject. */
export interface C15tEndpointOptions {
	/**
	 * Inject `GET /api/c15t/init` and `GET /api/c15t/manifest`.
	 *
	 * Required for `mode: manifest()` unless you write the routes yourself.
	 *
	 * @default true when `mode.type === 'manifest'`, otherwise false
	 */
	enabled?: boolean;
	/** @default '/api/c15t/init' */
	initPath?: string;
	/** @default '/api/c15t/manifest' */
	manifestPath?: string;
}

/** How the integration registers its `pre`-order middleware. */
export interface C15tMiddlewareOptions {
	/**
	 * Register `@c15t/astro/middleware` at all.
	 *
	 * @default true
	 */
	enabled?: boolean;
	/**
	 * Extra path prefixes the middleware leaves alone.
	 *
	 * The integration's own init and manifest routes are always skipped, so
	 * this is only for routes of your own that must not resolve consent —
	 * health checks, webhooks, anything that would otherwise pay for a
	 * decision it never renders. A path matches when it is the pathname
	 * exactly or a parent segment of it, so `'/api'` covers `/api/health`.
	 *
	 * `Astro.locals.c15t` is left unset on a skipped route.
	 *
	 * @example ['/api/webhooks', '/healthz']
	 */
	skip?: string[];
	/**
	 * Longest a server render waits for the visitor's policy, in
	 * milliseconds.
	 *
	 * The middleware resolves consent before the page renders, so a slow or
	 * unreachable backend holds the whole response. When the budget runs out
	 * the page renders without the server decision: no banner in the HTML,
	 * optional categories denied, gated scripts and iframes blocked. The
	 * browser then resolves the policy and shows the banner. A manifest
	 * request keeps running and fills the cache for the next render.
	 *
	 * `false` waits for the backend however long it takes.
	 *
	 * @default 500
	 */
	timeoutMs?: number | false;
}

/** Options accepted by the `c15t()` Astro integration. */
export interface C15tAstroOptions {
	/** Host layout and styling constrained by the active policy. */
	presentation?: ConsentPresentation;
	/**
	 * A/B experiment on prompt/preferences presentation. The assigned arm is
	 * merged over `presentation`, exposed as `snapshot.experiment`, and
	 * recorded with the impressions and choices of visitors the banner
	 * showed it to. The banner is server-rendered, so the arm is resolved on
	 * the server: per request through `consentMiddleware({ experimentArm })`
	 * with `middleware: false`, or one fixed `arm` for every visitor.
	 * Built-in assignment is not available on Astro.
	 */
	experiment?: ConsentExperiment;
	/**
	 * Transport selection. Build it with `hosted()`, `offline()` or
	 * `manifest()` so the descriptor stays well-formed.
	 */
	mode: C15tModeDescriptor;

	/** Categories offered in the banner and preference centre. */
	consentCategories?: AllConsentNames[];

	/** Consent-gated scripts handed to the core script loader. */
	scripts?: Script[];

	/** Browser data to remove when its consent permission is revoked. */
	clearOnRevocation?: ClearOnRevocationConfig;

	/**
	 * Reload the page after an accept, reject or save turns off a category or
	 * vendor that was granted, or after a `consentSource` withdraws one.
	 * Removing a script cannot stop code that already ran, so the reload
	 * starts a document with only permitted code. Waits for the save request.
	 * Set `false` to handle revocation yourself.
	 * @default true
	 */
	reloadOnConsentRevoked?: boolean;

	/**
	 * Block `fetch` and XHR requests that match these rules until the
	 * visitor's consent allows them. Omitted or `false` disables it.
	 * `onRequestBlocked` is a callback, so it belongs in
	 * {@link C15tClientOptionsExtension.networkBlocker}.
	 */
	networkBlocker?:
		| Omit<RuntimeNetworkBlockerOptions, 'onRequestBlocked'>
		| false;

	/**
	 * IAB TCF configuration. `false` disables it.
	 *
	 * Only the serializable fields are accepted here; a live GVL fetcher
	 * belongs in {@link C15tAstroOptions.clientEntrypoint}.
	 */
	iab?: C15tIABOptions | false;

	/** Cookie/localStorage configuration for persisted consent. */
	storageConfig?: StorageConfig;

	/** Locale and message overrides. */
	i18n?: C15tI18nOptions;

	/**
	 * Theme tokens applied to the banner and dialog surfaces. The server
	 * renders them as a `<style id="c15t-theme">` next to the config script.
	 */
	theme?: Theme;

	/**
	 * Light or dark for the banner and dialogs.
	 *
	 * `'system'` follows `prefers-color-scheme` and keeps following it as
	 * the visitor changes it. `<ConsentScript />` writes the class from a
	 * tiny inline script in `<head>`, so the server-rendered banner is
	 * already dark on its first paint rather than flashing light.
	 *
	 * `'none'` hands the `c15t-dark` class on `<html>` to the site: c15t
	 * neither sets nor clears it, on boot, on ClientRouter navigation or when
	 * a dialog opens. Use it when the site's own theme switch toggles it.
	 * `null` means the same, as it does in the React, Vue and Svelte
	 * providers.
	 *
	 * @default 'system'
	 */
	colorScheme?: C15tColorScheme | null;

	/**
	 * Skip the banner's entry animation and the dialogs' enter and exit
	 * animations. `<ConsentBanner disableAnimation>` and the other consent
	 * components take the same prop to override it for one surface.
	 *
	 * Left unset, animations play, and visitors who ask for reduced motion
	 * get none: the stylesheet stops them under `prefers-reduced-motion`,
	 * and the dialog islands follow the same setting.
	 */
	disableAnimation?: boolean;

	/** Legal links rendered inline in the banner and dialog. */
	legalLinks?: LegalLinks;

	/**
	 * Framework used to render the on-demand dialog islands.
	 *
	 * `'svelte'` ships the least JavaScript and is the default. Pick
	 * `'react'` or `'vue'` when the site already loads that runtime, so the
	 * dialog reuses it instead of adding a second framework. Whichever you
	 * pick, install the matching Astro integration — `@astrojs/svelte`,
	 * `@astrojs/react` or `@astrojs/vue` — and list it before `c15t()`.
	 *
	 * @default 'svelte'
	 */
	ui?: C15tUIAdapterName;

	/**
	 * Add `@c15t/astro/styles.css` to every page, and
	 * `@c15t/astro/iab/styles.css` when {@link C15tAstroOptions.iab} is set.
	 *
	 * Set to `false` to import them yourself, for example from a global
	 * stylesheet with your own cascade layers, or to style the surfaces from
	 * scratch.
	 *
	 * @default true
	 */
	styles?: boolean;

	/** Injected API routes. */
	endpoints?: C15tEndpointOptions | boolean;

	/**
	 * Module specifier whose default export is a
	 * {@link C15tClientOptionsExtension}. Use it for anything that cannot be
	 * serialized — callbacks, a custom GVL fetcher, scripts with lifecycle
	 * hooks.
	 *
	 * @example './src/c15t.client.ts'
	 */
	clientEntrypoint?: string;

	/**
	 * Register the `pre`-order middleware that populates `Astro.locals.c15t`.
	 *
	 * `false` is the same as `{ enabled: false }`. The middleware already
	 * skips the integration's own init and manifest routes, so a site that
	 * serves its own manifest does not have to hand-roll one to break the
	 * cycle; use `skip` to add routes of your own.
	 *
	 * @default true
	 */
	middleware?: boolean | C15tMiddlewareOptions;

	/**
	 * Fail the build when the Astro integration for {@link C15tAstroOptions.ui}
	 * is missing. Set to `false` for banner-only sites, which render no
	 * island at all.
	 *
	 * @default true
	 */
	requireUIIntegration?: boolean;
}

/**
 * IAB TCF options accepted by the integration.
 *
 * The serializable subset of the runtime's `RuntimeIABOptions`: a custom
 * fetcher cannot survive the trip into the injected boot script, so that
 * belongs in {@link C15tAstroOptions.clientEntrypoint} instead. A vendor
 * list itself is plain JSON and does travel — see {@link C15tIABOptions.gvl}.
 */
export interface C15tIABOptions {
	/** Set `false` to keep IAB configured but inert. */
	enabled?: boolean;
	/**
	 * A vendor list to use as-is, instead of fetching one.
	 *
	 * The server needs a GVL to render `<IABConsentBanner />` at all — the
	 * banner names the purposes and counts the vendors — so hosted and
	 * manifest mode get theirs from `/init`. Offline mode has no backend to
	 * ask, which is what this is for: a pinned list, or a fixture in a
	 * demo. It is inlined into the page's boot payload, so keep it trimmed
	 * to the vendors the site actually works with.
	 */
	gvl?: GlobalVendorList;
	/** IAB-registered CMP ID. A hosted backend can supply it through `/init`. */
	cmpId?: number;
	/** CMP version reported through `__tcfapi`. */
	cmpVersion?: number;
	/** Restricts the vendor list to these vendor IDs. */
	vendors?: number[];
	/** Publisher country code used in the TC string. */
	publisherCountryCode?: string;
	/**
	 * Ignored: c15t always encodes IsServiceSpecific=1.
	 *
	 * @deprecated TCF requires IsServiceSpecific=1. Group-specific scope is
	 * also encoded as 1. Passing `false` logs a warning once and has no
	 * other effect.
	 */
	isServiceSpecific?: boolean;
	/**
	 * Publisher restrictions to encode into the TC string and apply to IAB
	 * gates. Plain data, so it travels to the browser with the rest of these
	 * options. `@c15t/iab` rejects restrictions the vendor list does not allow.
	 */
	publisherRestrictions?: PublisherRestriction[];
	/**
	 * Fetch the vendor list from this URL on the server.
	 *
	 * Goes through the shared in-process cache in `@c15t/core/server`, so
	 * concurrent renders collapse onto one download. Ignored when
	 * {@link C15tIABOptions.gvl} is set.
	 */
	gvlURL?: string;
}

/** Locale configuration accepted by the integration. */
export interface C15tI18nOptions {
	/** Force a locale instead of negotiating `Accept-Language`. */
	locale?: string;
	/** Per-language message overrides, deep-merged over the defaults. */
	messages?: Record<string, unknown>;
	/**
	 * Negotiate the locale from the request's `Accept-Language` header.
	 *
	 * @default true
	 */
	detectLanguage?: boolean;
}

/**
 * Non-serializable additions merged over the integration options in the
 * browser. Default-export this from
 * {@link C15tAstroOptions.clientEntrypoint}.
 */
export interface C15tClientOptionsExtension {
	/**
	 * Scripts added to the integration's `scripts`.
	 *
	 * Under Astro's CSP, the integration cannot hash an inline
	 * (`textContent`) script from here, because this module only runs in
	 * the browser. The browser logs the hash of each one the policy lacks;
	 * add it to the CSP config's `scriptDirective.hashes`, or move a script
	 * without callbacks into the integration's `scripts` option, which c15t
	 * hashes for you.
	 */
	scripts?: Script[];
	/** Overrides cleanup targets from the integration options. */
	clearOnRevocation?: ClearOnRevocationConfig;
	/**
	 * Replaces {@link C15tAstroOptions.networkBlocker}. Use it to pass
	 * `onRequestBlocked`.
	 */
	networkBlocker?: RuntimeNetworkBlockerOptions | false;
	callbacks?: ConsentRuntimeOptions['callbacks'];
	/** External CMP owns consent decisions and preferences. */
	consentSource?: ConsentRuntimeOptions['consentSource'];
	/**
	 * Merged over the serialized theme for slot styles and consent-action
	 * variants. Design tokens here are not applied: the browser no longer
	 * generates theme CSS, so put tokens in the integration's `theme`.
	 */
	theme?: Theme;
}

/**
 * The serialized options shape shared by the middleware, the components and
 * the client boot script.
 *
 * @internal
 */
export interface C15tResolvedOptions extends Omit<
	C15tAstroOptions,
	'endpoints' | 'middleware' | 'requireUIIntegration'
> {
	ui: C15tUIAdapterName;
	colorScheme: C15tColorScheme;
	endpoints: Required<Omit<C15tEndpointOptions, 'enabled'>> & {
		enabled: boolean;
	};
	middleware: Required<Omit<C15tMiddlewareOptions, 'timeoutMs'>> &
		Pick<C15tMiddlewareOptions, 'timeoutMs'>;
	/**
	 * Set when the site turned on Astro's CSP and has a `clientEntrypoint`.
	 * The browser checks the inline scripts that module adds against it.
	 */
	csp?: C15tBrowserCsp;
}

/**
 * The part of Astro's CSP the browser needs to tell which inline scripts
 * from a `clientEntrypoint` the policy will block.
 *
 * @internal
 */
export interface C15tBrowserCsp {
	/** The digest the policy's hashes use. */
	algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512';
	/** Every script hash the policy allows: c15t's and the site's own. */
	scriptHashes: string[];
}

/** Consent context the middleware attaches to every request. */
export interface C15tLocals {
	/**
	 * Server-resolved kernel configuration. `<ConsentScript />` and
	 * `<ConsentBanner />` inline it as a JSON data block (see
	 * `buildConfigJSON()`) so the browser boots with no `/init` roundtrip.
	 */
	config: KernelConfig;

	/**
	 * The kernel snapshot derived from {@link C15tLocals.config}. Components
	 * read translations, policy UI hints and consent state from here so the
	 * server and the browser agree on first paint.
	 */
	snapshot: ConsentSnapshot;

	/** Whether the server decided this request should see the banner. */
	shouldShowBanner: boolean;

	/**
	 * Whether this render is shared by every visitor, as on a prerendered
	 * route. Consent surfaces then render hidden, and the browser shows
	 * them once it has read the visitor's own cookie.
	 */
	prerendered: boolean;

	/**
	 * Whether a policy rule is resolved for this request. Every c15t consent
	 * surface renders nothing until one is: an unconfigured, failed, or
	 * unmatched resolution leaves nothing to consent to, and the browser shows
	 * the surfaces on its own once a later init supplies a rule.
	 */
	hasPolicy: boolean;

	/**
	 * Whether the resolved rule owes any consent UI. A prompt owes a banner
	 * and a preference center; rights owe a way back to preferences. A `none`
	 * rule with no rights owes neither, so no surface renders while the
	 * permissions it grants apply. `false` until a rule is resolved.
	 */
	hasConsentUi: boolean;

	/** Resolved policy decision, when the transport produced one. */
	decision: PolicyResolution;

	/** Normalized request inputs (geo, language, GPC). */
	inputs: {
		country?: string;
		region?: string;
		language?: string;
		gpc?: boolean;
	};

	/** The integration options, as the browser will receive them. */
	options: C15tResolvedOptions;

	/**
	 * Content Security Policy nonce for this request.
	 *
	 * c15t's middleware leaves it unset. Set it from your own middleware,
	 * which runs after c15t's, when your policy allows inline code by nonce
	 * instead of `'unsafe-inline'`. Every inline `<script>` and `<style>`
	 * the c15t components render carries it, and the browser runtime puts
	 * it on the scripts it loads, the gated inline scripts it activates and
	 * the dialog stylesheets it links.
	 *
	 * @example
	 * ```ts
	 * // src/middleware.ts
	 * import { defineMiddleware } from 'astro:middleware';
	 *
	 * export const onRequest = defineMiddleware(async (context, next) => {
	 *   const nonce = crypto.randomUUID();
	 *   if (context.locals.c15t) {
	 *     context.locals.c15t.nonce = nonce;
	 *   }
	 *   const response = await next();
	 *   response.headers.set(
	 *     'content-security-policy',
	 *     `script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'`
	 *   );
	 *   return response;
	 * });
	 * ```
	 */
	nonce?: string;
}
