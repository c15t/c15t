/**
 * Shared types for the script-loader module.
 *
 * Public types (`ScriptLoaderOptions`, `ScriptLoaderHandle`,
 * `ScriptLoaderDebugEvent`) are re-exported by `index.ts` so consumers
 * can keep importing from `c15t/v3/modules/script-loader`.
 *
 * Internal types (`NormalizedScript`, `ReconcilePass`, `PendingMount`)
 * are exported here so siblings (`eligibility.ts`, `mount.ts`, etc.)
 * can share them. They are not re-exported from `index.ts`.
 */

import type {
	Script,
	ScriptCallbackInfo,
} from '../../../libs/script-loader/types';
import type { AllConsentNames } from '../../../types/consent-types';
import type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	KernelIABState,
} from '../../types';

export type { Script, ScriptCallbackInfo };

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
		| 'unloaded'
		| 'already_loaded'
		| 'error'
		| 'callback_invoked'
		| 'callback_error';
	message: string;
	scriptId: string;
	elementId?: string;
	hasConsent?: boolean;
	callback?: 'onLoad' | 'onError' | 'onConsentChange' | 'onBeforeLoad';
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
	 * When true, also dispatch debug events to any listeners registered
	 * on `window.__c15tScriptDebugListeners` (v2 compat). Default: true
	 * when running in a browser.
	 */
	emitToV2DebugListeners?: boolean;
}

export interface ScriptLoaderHandle {
	/** Tear down subscription and remove mounted elements. */
	dispose(): void;
	/** Swap the script configuration. Reconciles DOM immediately. */
	updateScripts(next: Script[]): void;
	/** Current set of loaded script IDs. */
	getLoadedScriptIds(): string[];
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
}

/**
 * Per-reconcile context derived once from the snapshot and shared by
 * every script gate in this pass. Building this once per reconcile (vs
 * once per script) is the difference between O(n) and O(n²) work in
 * large script sets.
 */
export interface ReconcilePass {
	snapshot: ConsentSnapshot;
	consents: ConsentState;
	isIabMode: boolean;
	iab: KernelIABState | null;
}

/**
 * A script that's ready to mount but whose DOM append has been deferred
 * to a batched `flushPendingMounts` call. Batching lets a burst of
 * mounts (e.g. accept-all on a page with many scripts) trigger one
 * layout invalidation per append target instead of one per script.
 */
export interface PendingMount {
	script: Script;
	element: HTMLScriptElement;
	target: HTMLElement;
	elementId: string;
	hasConsent: boolean;
	info: ScriptCallbackInfo | undefined;
}
