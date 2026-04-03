import type { AllConsentNames, Script } from 'c15t';

// ─────────────────────────────────────────────────────────────────────────────
// Manifest Step Types — individual operations the runtime can execute
// ─────────────────────────────────────────────────────────────────────────────

export interface LoadScriptStep {
	type: 'loadScript';
	src: string;
	async?: boolean;
	defer?: boolean;
	attributes?: Record<string, string>;
}

export interface SetGlobalStep {
	type: 'setGlobal';
	/** Global variable name (e.g. 'dataLayer') */
	name: string;
	/** Value to assign. Arrays and objects are shallow-cloned on execution. */
	value: unknown;
	/**
	 * Only set the global if it's not already defined.
	 * Mirrors the common `window.x = window.x || value` pattern.
	 * @default true
	 */
	ifUndefined?: boolean;
}

export interface CallGlobalStep {
	type: 'callGlobal';
	/** Global object name (e.g. 'posthog', 'fbq') */
	global: string;
	/** Method to call on the global. If omitted, the global itself is called as a function. */
	method?: string;
	/** Arguments to pass */
	args?: unknown[];
}

export interface PushToDataLayerStep {
	type: 'pushToDataLayer';
	/** Data object to push to window.dataLayer */
	data: Record<string, unknown>;
}

export interface InlineScriptStep {
	type: 'inlineScript';
	/** JavaScript code to execute via a dynamically created script element */
	code: string;
}

export type ManifestStep =
	| LoadScriptStep
	| SetGlobalStep
	| CallGlobalStep
	| PushToDataLayerStep
	| InlineScriptStep;

// ─────────────────────────────────────────────────────────────────────────────
// Consent Signal — how to communicate consent state to the vendor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consent signal type determines how consent state is communicated to the vendor.
 *
 * - `'gtag'` — Google Consent Mode pattern: calls `gtag('consent', 'default'|'update', state)`
 */
export type ConsentSignalType = 'gtag';

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Manifest — declarative vendor integration definition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A declarative definition of a vendor integration.
 *
 * Manifests are the single source of truth for how a vendor's scripts
 * are loaded and how consent state is communicated. They work across
 * all c15t deployment paths:
 *
 * - **Bundled**: `resolveManifest()` compiles the manifest into a `Script`
 *   object with real callbacks at import time.
 * - **Embed**: The manifest JSON is served via `/init` and resolved at runtime.
 * - **Dashboard**: The manifest is what the dashboard stores and serves.
 */
export interface VendorManifest {
	/** Unique vendor identifier (used as Script.id) */
	vendor: string;

	/** Consent category required to load this vendor */
	category: AllConsentNames | string;

	/** Load regardless of consent state (vendor manages its own consent internally) */
	alwaysLoad?: boolean;

	/** Keep script in DOM after consent revocation (vendor has a consent API) */
	persistAfterConsentRevoked?: boolean;

	/**
	 * Steps to execute when installing the vendor.
	 *
	 * The resolver extracts the script source from these steps:
	 * - If a `loadScript` step exists, its `src` becomes `Script.src`
	 * - If no `loadScript` exists, `inlineScript` steps become `Script.textContent`
	 * - All other steps run as part of `onBeforeLoad`
	 */
	install: ManifestStep[];

	/** Steps to execute after the main script loads */
	afterLoad?: ManifestStep[];

	/** Steps to run on any consent state change */
	onConsentChange?: ManifestStep[];

	/** Steps to run when this vendor's category consent is granted */
	onConsentGranted?: ManifestStep[];

	/** Steps to run when this vendor's category consent is denied */
	onConsentDenied?: ManifestStep[];

	/**
	 * Maps c15t consent categories to vendor-specific consent type names.
	 *
	 * Used with `consentSignal` to translate c15t consent state into
	 * the vendor's consent API format.
	 *
	 * @example
	 * ```ts
	 * // Google Consent Mode v2 mapping
	 * consentMapping: {
	 *   marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
	 *   measurement: ['analytics_storage'],
	 *   functionality: ['functionality_storage'],
	 *   necessary: ['security_storage'],
	 *   experience: ['personalization_storage'],
	 * }
	 * ```
	 */
	consentMapping?: Record<string, string[]>;

	/** How to signal consent state to the vendor */
	consentSignal?: ConsentSignalType;

	/** Target global for consent signaling (defaults based on signal type) */
	consentSignalTarget?: string;
}

/**
 * Options accepted by typed vendor helpers alongside the manifest config.
 * Allows users to override any Script property for customization.
 */
export interface VendorScriptOverrides {
	script?: Partial<Script>;
}
