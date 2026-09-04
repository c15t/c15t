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
	ConsentSnapshot,
	KernelConfig,
	LegalLinks,
	PolicyConfig,
	PolicyDecision,
	Script,
	StorageConfig,
} from '@c15t/core';
import type { ConsentManifest } from '@c15t/schema/types';
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
	policyPacks?: PolicyConfig[];
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
}

/** Which framework renders the on-demand dialog islands. */
export type C15tUIAdapterName = 'svelte';

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

/** Options accepted by the `c15t()` Astro integration. */
export interface C15tAstroOptions {
	/**
	 * Transport selection. Build it with `hosted()`, `offline()` or
	 * `manifest()` so the descriptor stays well-formed.
	 */
	mode: C15tModeDescriptor;

	/** Categories offered in the banner and preference centre. */
	consentCategories?: AllConsentNames[];

	/** Consent-gated scripts handed to the core script loader. */
	scripts?: Script[];

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

	/** Theme tokens applied to the banner and dialog surfaces. */
	theme?: Theme;

	/** Legal links rendered inline in the banner and dialog. */
	legalLinks?: LegalLinks;

	/**
	 * Framework used to render the on-demand dialog islands.
	 *
	 * `'svelte'` is the only adapter today; the option exists so React, Vue
	 * and Solid surfaces can be added without a breaking change.
	 *
	 * @default 'svelte'
	 */
	ui?: C15tUIAdapterName;

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
	 * @default true
	 */
	middleware?: boolean;

	/**
	 * Fail the build when `@astrojs/svelte` is missing while a Svelte dialog
	 * surface is configured. Set to `false` for banner-only sites.
	 *
	 * @default true
	 */
	requireSvelte?: boolean;
}

/** IAB TCF options accepted by the integration. */
export interface C15tIABOptions {
	enabled?: boolean;
	cmpId?: number;
	cmpVersion?: number;
	vendors?: number[];
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
	scripts?: Script[];
	callbacks?: Record<string, unknown>;
	/** Merged over the serialized theme. */
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
	'endpoints' | 'middleware' | 'requireSvelte'
> {
	ui: C15tUIAdapterName;
	endpoints: Required<Omit<C15tEndpointOptions, 'enabled'>> & {
		enabled: boolean;
	};
}

/** Consent context the middleware attaches to every request. */
export interface C15tLocals {
	/**
	 * Server-resolved kernel configuration. Inline it into the page with
	 * `<ConsentBanner />` or `buildConfigScript()` so the browser boots with
	 * no `/init` roundtrip.
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

	/** Resolved policy decision, when the transport produced one. */
	decision: PolicyDecision | null;

	/** Normalized request inputs (geo, language, GPC). */
	inputs: {
		country?: string;
		region?: string;
		language?: string;
		gpc?: boolean;
	};

	/** The integration options, as the browser will receive them. */
	options: C15tResolvedOptions;
}
