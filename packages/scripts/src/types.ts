import type { AllConsentNames, HasCondition } from 'c15t';

export const VENDOR_MANIFEST_KIND = 'c15t.vendor-manifest';
export const VENDOR_MANIFEST_SCHEMA_VERSION = 1;
export const vendorManifestContract = {
	kind: VENDOR_MANIFEST_KIND,
	schemaVersion: VENDOR_MANIFEST_SCHEMA_VERSION,
} as const;

export interface ManifestContract {
	kind: typeof VENDOR_MANIFEST_KIND;
	schemaVersion: typeof VENDOR_MANIFEST_SCHEMA_VERSION;
}

type ManifestInterpolationToken = `{{${string}}}`;
export type ManifestCategoryCondition = HasCondition<
	AllConsentNames | ManifestInterpolationToken
>;

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
	/** Value to assign. Arrays and objects are recursively cloned on execution. */
	value: unknown;
	/**
	 * Only set the global if it's not already defined.
	 * Mirrors the common `window.x = window.x || value` pattern.
	 * @default true
	 */
	ifUndefined?: boolean;
}

export interface DefineQueueFunctionStep {
	type: 'defineQueueFunction';
	/** Global function name (e.g. 'gtag') */
	name: string;
	/** Global array name that receives queued calls (e.g. 'dataLayer') */
	queue: string;
	/**
	 * Only define the function if it is not already present.
	 * @default true
	 */
	ifUndefined?: boolean;
	/**
	 * Whether queued calls should store the `arguments` object or a copied array.
	 * @default 'arguments'
	 */
	pushStyle?: 'arguments' | 'array';
}

export interface DefineStubFunctionStep {
	type: 'defineStubFunction';
	/** Global function name (e.g. 'fbq', 'twq', 'lintrk') */
	name: string;
	/**
	 * Queue storage location:
	 * - `global` pushes into another global array (e.g. `dataLayer`)
	 * - `property` pushes into a property on the stub function itself (e.g. `fbq.queue`)
	 */
	queue:
		| { global: string; property?: never }
		| { global?: never; property: string };
	/**
	 * If present, calls `stub[dispatchProperty](...args)` when available instead of queueing.
	 * Mirrors vendor APIs like Meta Pixel's `callMethod`.
	 */
	dispatchProperty?: string;
	/**
	 * How queued values should be stored.
	 * - `'arguments'` => push the `arguments` object
	 * - `'array'` => push a copied array of arguments
	 */
	queueFormat?: 'arguments' | 'array';
	/** Additional globals that should reference the same stub */
	aliases?: string[];
	/** Properties on the stub that should reference the stub itself (e.g. `push`) */
	selfReferences?: string[];
	/** Additional scalar/object properties assigned to the stub */
	properties?: Record<string, unknown>;
	/** Only define the stub if not already present. */
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

export interface PushToQueueStep {
	type: 'pushToQueue';
	/** Global array name that receives queued values (e.g. 'dataLayer') */
	queue: string;
	/** Value to push onto the queue */
	value: unknown;
}

export interface SetGlobalPathStep {
	type: 'setGlobalPath';
	/** Path segments under window (e.g. ['databuddy', 'options', 'disabled']) */
	path: string[];
	/** Value to assign at the target path */
	value: unknown;
}

export interface DefineQueueMethodsStep {
	type: 'defineQueueMethods';
	/** Global array/object name that owns the queue methods */
	target: string;
	/** Method names to attach */
	methods: string[];
	/** Optional queue location. Defaults to the target itself. */
	queue?:
		| { global: string; property?: never }
		| { global?: never; property: string };
}

export type GlobalMethodBehavior =
	| {
			name: string;
			behavior: 'noop';
	  }
	| {
			name: string;
			behavior: 'return';
			value: unknown;
	  };

export interface DefineGlobalMethodsStep {
	type: 'defineGlobalMethods';
	/** Global object name to receive the methods */
	target: string;
	methods: Array<GlobalMethodBehavior>;
}

export interface ConstructGlobalStep {
	type: 'constructGlobal';
	/** Global constructor name (e.g. `UET`) */
	constructor: string;
	/** Global name to assign the constructed instance to */
	assignTo: string;
	/** Constructor args */
	args?: unknown[];
	/**
	 * Copies the current `window[assignTo]` value into the first constructor arg object
	 * under this property before constructing.
	 */
	copyAssignedValueToArgProperty?: string;
}

export type ManifestStep =
	| LoadScriptStep
	| SetGlobalStep
	| DefineQueueFunctionStep
	| DefineStubFunctionStep
	| CallGlobalStep
	| PushToQueueStep
	| SetGlobalPathStep
	| DefineQueueMethodsStep
	| DefineGlobalMethodsStep
	| ConstructGlobalStep;

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
 * Manifests are the source definition that the scripts engine compiles into a
 * serializable resolved manifest and then converts into a runtime `Script`.
 */
export interface VendorManifest extends ManifestContract {
	/** Manifest contract identifier. */
	kind: typeof VENDOR_MANIFEST_KIND;

	/** Manifest schema version. */
	schemaVersion: typeof VENDOR_MANIFEST_SCHEMA_VERSION;

	/** Unique vendor identifier (used as Script.id) */
	vendor: string;

	/** Consent category or condition required to load this vendor */
	category: ManifestCategoryCondition;

	/** Load regardless of consent state (vendor manages its own consent internally) */
	alwaysLoad?: boolean | string;

	/** Keep script in DOM after consent revocation (vendor has a consent API) */
	persistAfterConsentRevoked?: boolean | string;

	/**
	 * Steps that must execute before default consent signaling.
	 *
	 * This is primarily used for integrations such as Google tags where a stub
	 * global must exist before calling the vendor's consent API.
	 */
	bootstrap?: ManifestStep[];

	/**
	 * Steps to execute when installing the vendor.
	 *
	 * The resolver extracts the script source from these steps:
	 * - If a `loadScript` step exists, its `src` becomes `Script.src`
	 * - All non-`loadScript` steps run as part of `onBeforeLoad`
	 */
	install: ManifestStep[];

	/** Steps to execute after the main script loads */
	afterLoad?: ManifestStep[];

	/** Steps to execute before load when the vendor has consent */
	onBeforeLoadGranted?: ManifestStep[];

	/** Steps to execute before load when the vendor does not have consent */
	onBeforeLoadDenied?: ManifestStep[];

	/** Steps to execute after load when the vendor has consent */
	onLoadGranted?: ManifestStep[];

	/** Steps to execute after load when the vendor does not have consent */
	onLoadDenied?: ManifestStep[];

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
 * Internal transport-ready manifest shape produced by the compile phase.
 *
 * Contains only serializable data and no runtime callbacks.
 */
export interface ResolvedManifest extends ManifestContract {
	vendor: string;
	category: HasCondition<AllConsentNames>;
	alwaysLoad?: boolean;
	persistAfterConsentRevoked?: boolean;
	bootstrapSteps: ManifestStep[];
	setupSteps: ManifestStep[];
	loadScript?: LoadScriptStep;
	afterLoadSteps: ManifestStep[];
	onBeforeLoadGrantedSteps: ManifestStep[];
	onBeforeLoadDeniedSteps: ManifestStep[];
	onLoadGrantedSteps: ManifestStep[];
	onLoadDeniedSteps: ManifestStep[];
	onConsentChangeSteps: ManifestStep[];
	onConsentGrantedSteps: ManifestStep[];
	onConsentDeniedSteps: ManifestStep[];
	consentMapping?: Record<string, string[]>;
	consentSignal?: ConsentSignalType;
	consentSignalTarget?: string;
}
