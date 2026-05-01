/**
 * c15t/v3/modules/script-loader
 *
 * Kernel-consuming script loader. Subscribes to the kernel snapshot and
 * reconciles DOM: mounts scripts that pass their consent condition,
 * unmounts scripts that no longer do, fires `onLoad` / `onError` /
 * `onConsentChange` callbacks, honors `alwaysLoad` /
 * `persistAfterConsentRevoked` / `callbackOnly` / `anonymizeId`.
 *
 * Concerns are split across siblings:
 * - `types.ts`        — public + internal type definitions.
 * - `normalize.ts`    — script normalization + element-ID resolution.
 * - `eligibility.ts`  — consent-gate evaluation.
 * - `callbacks.ts`    — lifecycle callback dispatch.
 * - `debug.ts`        — debug-event emission (consumer + v2 compat).
 * - `mount.ts`        — DOM mount / unmount / batched append.
 * - `index.ts`        — this file: wiring + reconcile loop.
 *
 * v2 parity: `packages/core/src/libs/script-loader/{core,utils,store,types}.ts`.
 *
 * Invariants:
 * - Idempotent by resolved element ID: calling `createScriptLoader` twice
 *   with the same scripts only mounts DOM once; later instances register
 *   the existing DOM element as loaded but do not own it.
 * - Minimal module state: anonymized element IDs are cached per page so
 *   fresh loader instances resolve the same DOM IDs. Other state remains
 *   per loader, except DOM append targets and optional
 *   `window.__c15tScriptDebugListeners` for v2 debug-event compatibility.
 * - `dispose()` removes every element this loader mounted and
 *   disconnects the kernel subscription. Elements mounted by other
 *   loaders (or already in the DOM) are left alone.
 */
import type { ConsentSnapshot } from '../../types';
import { createDebugEmitter } from './debug';
import { buildReconcilePass, isEligible } from './eligibility';
import {
	flushPendingMounts,
	type MountDeps,
	mountScript,
	unmountScript,
} from './mount';
import { createElementIdResolver, normalizeScripts } from './normalize';
import type {
	NormalizedScript,
	PendingMount,
	Script,
	ScriptLoaderHandle,
	ScriptLoaderOptions,
} from './types';

export type {
	Script,
	ScriptCallbackInfo,
	ScriptLoaderDebugEvent,
	ScriptLoaderHandle,
	ScriptLoaderOptions,
} from './types';

export function createScriptLoader(
	options: ScriptLoaderOptions
): ScriptLoaderHandle {
	const { kernel, onDebug } = options;
	const emitToV2 = options.emitToV2DebugListeners ?? true;
	const emit = createDebugEmitter({ onDebug, emitToV2 });
	const hasDebugListener = !!onDebug || emitToV2;

	let normalized: NormalizedScript[] = normalizeScripts(options.scripts);

	const loadedElements = new Map<string, HTMLScriptElement | null>();
	const ownedScriptIds = new Set<string>();
	const elementIds = createElementIdResolver();
	const eligibilityByScriptId = new Map<string, boolean>();

	const mountDeps: MountDeps = {
		loadedElements,
		ownedScriptIds,
		elementIds,
		emit,
		hasDebugListener,
	};

	// Track the last-seen consent-relevant references so a kernel tick
	// that didn't actually change consent state (e.g. only `overrides`
	// flipped) skips the full reconcile. Hot-path optimization for pages
	// with many scripts and many subscribers.
	let lastConsents: unknown = null;
	let lastPolicyCategories: unknown = null;
	let lastScopeMode: unknown = null;
	let lastIab: unknown = null;

	function reconcile(force = false): void {
		const snapshot: ConsentSnapshot = kernel.getSnapshot();

		if (
			!force &&
			snapshot.consents === lastConsents &&
			snapshot.policyCategories === lastPolicyCategories &&
			snapshot.policyScopeMode === lastScopeMode &&
			snapshot.iab === lastIab
		) {
			return;
		}
		lastConsents = snapshot.consents;
		lastPolicyCategories = snapshot.policyCategories;
		lastScopeMode = snapshot.policyScopeMode;
		lastIab = snapshot.iab;

		const pass = buildReconcilePass(snapshot);
		const batch: PendingMount[] = [];

		for (const entry of normalized) {
			const { script } = entry;
			const eligible = isEligible(entry, pass);
			const previousEligibility = eligibilityByScriptId.get(script.id);
			eligibilityByScriptId.set(script.id, eligible);

			if (!force && previousEligibility === eligible) continue;

			if (eligible) {
				mountScript(mountDeps, script, snapshot, true, batch);
			} else {
				unmountScript(mountDeps, script, snapshot, false);
			}
		}

		flushPendingMounts(mountDeps, batch);
	}

	// Initial reconciliation — caller is already inside useEffect /
	// onMounted when invoking the factory, so this runs in the browser.
	reconcile(true);
	const unsubscribe = kernel.subscribe(() => reconcile());

	return {
		dispose() {
			unsubscribe();
			if (typeof document === 'undefined') return;
			for (const [scriptId, element] of loadedElements) {
				if (!ownedScriptIds.has(scriptId)) continue;
				if (element?.parentNode) {
					element.parentNode.removeChild(element);
				}
			}
			loadedElements.clear();
			ownedScriptIds.clear();
			elementIds.clear();
			eligibilityByScriptId.clear();
		},
		updateScripts(next: Script[]) {
			const nextIds = new Set(next.map((s) => s.id));
			const snapshot = kernel.getSnapshot();
			for (const { script } of normalized) {
				if (!nextIds.has(script.id)) {
					unmountScript(mountDeps, script, snapshot, false);
					eligibilityByScriptId.delete(script.id);
				}
			}
			normalized = normalizeScripts(next);
			reconcile(true);
		},
		getLoadedScriptIds() {
			return Array.from(loadedElements.keys());
		},
	};
}
