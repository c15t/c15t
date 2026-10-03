/**
 * Shared types for the script-loader module.
 *
 * Public types (`ScriptLoaderOptions`, `ScriptLoaderHandle`,
 * `ScriptLoaderDebugEvent`) are re-exported by `index.ts` so consumers
 * can keep importing from `@c15t/core/modules/script-loader`.
 *
 * Internal types (`NormalizedScript`, `ReconcilePass`, `PendingMount`)
 * are exported here so siblings (`eligibility.ts`, `mount.ts`, etc.)
 * can share them. They are not re-exported from `index.ts`.
 */

import type { AllConsentNames } from '../../consent/consent-types';
import type { extractConsentNamesFromCondition } from '../../libs/has';
import type {
	Script,
	ScriptCallbackInfo,
} from '../../libs/script-loader/types';
import type {
	declareOwnedVendors,
	forgetOwnedVendors,
	isValidVendorId,
} from '../../libs/vendors';
import type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	KernelIABState,
} from '../../types';
import type {
	deniedVendorIds,
	evaluateConsent,
	getEffectiveGateState,
	has,
} from '../has';

export type { Script, ScriptCallbackInfo };

/**
 * What the script loader calls but does not import, so it can load on
 * demand as one self-contained chunk. Vendor ownership keeps state per
 * kernel, so these are always the shared implementations; the public
 * entry passes them.
 * @internal
 */
export interface ScriptLoaderTools {
	/** `extractConsentNamesFromCondition`. */
	categoriesOf: typeof extractConsentNamesFromCondition;
	/** `declareOwnedVendors`. */
	declareOwners: typeof declareOwnedVendors;
	/** `deniedVendorIds`. */
	deniedVendors: typeof deniedVendorIds;
	/** `evaluateConsent`. */
	evaluate: typeof evaluateConsent;
	/** `forgetOwnedVendors`. */
	forgetOwners: typeof forgetOwnedVendors;
	/** `getEffectiveGateState`. */
	gateState: typeof getEffectiveGateState;
	has: typeof has;
	/** `isValidVendorId`. */
	isVendorId: typeof isValidVendorId;
}

/**
 * Structured debug event emitted at every reconcile / mount / unmount /
 * callback step. Consumed by adapter devtools and the v2 compat surface
 * (`window.__c15tScriptDebugListeners`).
 */
export interface ScriptLoaderDebugEvent {
	source: 'script-loader';
	scope: 'lifecycle' | 'phase' | 'step';
	action:
		| 'skipped'
		| 'loaded'
		| 'load_completed'
		| 'unloaded'
		| 'already_loaded'
		| 'error'
		| 'callback_invoked'
		| 'callback_error';
	message: string;
	scriptId: string;
	elementId?: string;
	hasConsent?: boolean;
	callback?:
		| 'onLoad'
		| 'onError'
		| 'onConsentChange'
		| 'onBeforeLoad'
		| 'onDispose';
	data?: Record<string, unknown>;
	timestamp: number;
}

export interface ScriptLoaderOptions {
	kernel: ConsentKernel;
	/** Script configurations. May be empty; `updateScripts` swaps later. */
	scripts: Script[];
	/** Optional synchronous listener for debug events. */
	onDebug?: (event: ScriptLoaderDebugEvent) => void;
	/**
	 * Content Security Policy nonce applied to every `<script>` element the
	 * loader creates. A per-script `nonce` takes precedence.
	 */
	nonce?: string;
	/**
	 * When true, also dispatch debug events to any listeners registered
	 * on `window.__c15tScriptDebugListeners` (v2 compat). Default: true
	 * when running in a browser.
	 */
	emitToV2DebugListeners?: boolean;
}

export interface ScriptLoaderHandle {
	/** Tear down subscription and remove mounted elements. */
	dispose: () => void;
	/** Swap the script configuration. Reconciles DOM immediately. */
	updateScripts: (next: Script[]) => void;
	/** Current set of loaded script IDs. */
	getLoadedScriptIds: () => string[];
}

/**
 * A `Script` plus precomputed metadata we need on every reconcile pass.
 *
 * - `hasIabMeta` — true when the script declares any IAB metadata
 *   (`vendorId`, `iabPurposes`, `iabLegIntPurposes`, `iabSpecialFeatures`).
 *   Used to route eligibility through `hasIABConsent` in IAB mode.
 * - `simpleCategory` — set when `script.category` is a single category
 *   name string. Avoids re-parsing the category tree on every reconcile.
 */
export interface NormalizedScript {
	script: Script;
	hasIabMeta: boolean;
	simpleCategory: AllConsentNames | null;
	/** Vendor slug for vendor-level consent outside IAB, if declared. */
	vendor: string | null;
}

/**
 * Per-reconcile context derived once from the snapshot and shared by
 * every script gate in this pass. Building this once per reconcile (vs
 * once per script) is the difference between O(n) and O(n²) work in
 * large script sets.
 */
export interface ReconcilePass {
	snapshot: ConsentSnapshot;
	tools: Pick<ScriptLoaderTools, 'evaluate' | 'has'>;
	consents: ConsentState;
	isIabMode: boolean;
	iab: KernelIABState | null;
	/** Vendors the subject turned off, or `null` when none is denied. */
	vendorDenied: ReadonlySet<string> | null;
}

/**
 * A script that's ready to mount but whose DOM append has been deferred
 * to a batched `flushPendingMounts` call. Batching lets a burst of
 * mounts (e.g. accept-all on a page with many scripts) trigger one
 * layout invalidation per append target instead of one per script.
 */
export interface PendingMount {
	/** Records insertion even if inline execution removes its own element. */
	appended: boolean;
	script: Script;
	element: HTMLScriptElement;
	target: HTMLElement;
	elementId: string;
	hasConsent: boolean;
	info: ScriptCallbackInfo | undefined;
}
