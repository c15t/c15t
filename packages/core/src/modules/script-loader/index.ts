/**
 * `@c15t/core/modules/script-loader`
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
import { getEffectiveGateState } from '../has';
import { createDebugEmitter } from './debug';
import {
	buildReconcilePass,
	hasScriptConsent,
	isEligible,
} from './eligibility';
import { flushPendingMounts, mountScript, unmountScript } from './mount';
import type { MountDeps } from './mount';
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

export const createScriptLoader = function createScriptLoader(
	options: ScriptLoaderOptions
): ScriptLoaderHandle {
	const { kernel, onDebug } = options;
	const emitToV2 = options.emitToV2DebugListeners ?? true;
	const emit = createDebugEmitter({ emitToV2, onDebug });
	const hasDebugListener = !!onDebug || emitToV2;

	let normalized: NormalizedScript[] = normalizeScripts(options.scripts);

	const loadedElements = new Map<string, HTMLScriptElement | null>();
	const ownedScriptIds = new Set<string>();
	const elementIds = createElementIdResolver();
	const eligibilityByScriptId = new Map<string, boolean>();
	const consentByScriptId = new Map<string, boolean>();

	const mountDeps: MountDeps = {
		elementIds,
		emit,
		hasDebugListener,
		loadedElements,
		ownedScriptIds,
	};

	// Track the last-seen consent-relevant references so a kernel tick
	// that didn't actually change consent state (e.g. only `overrides`
	// flipped) skips the full reconcile. Hot-path optimization for pages
	// with many scripts and many subscribers.
	let lastConsents: unknown = null;
	let lastPolicyCategories: unknown = null;
	let lastScopeMode: unknown = null;
	let lastIab: unknown = null;
	let lastRestrictions: unknown = null;
	let lastModel: unknown = null;
	let lastEvaluationPolicy: unknown = null;

	const reconcile = function reconcile(force = false): void {
		const snapshot: ConsentSnapshot = kernel.getSnapshot();
		const effective = getEffectiveGateState(snapshot);
		const permissionsChanged = effective.effectivePermissions !== lastConsents;

		if (
			!force &&
			!permissionsChanged &&
			snapshot.policyRule.scope === lastPolicyCategories &&
			snapshot.policyRule.scopeMode === lastScopeMode &&
			snapshot.iab === lastIab &&
			effective.restrictions === lastRestrictions &&
			snapshot.model === lastModel &&
			snapshot.evaluationPolicy === lastEvaluationPolicy
		) {
			return;
		}
		lastConsents = effective.effectivePermissions;
		lastRestrictions = effective.restrictions;
		lastModel = snapshot.model;
		lastEvaluationPolicy = snapshot.evaluationPolicy;
		lastPolicyCategories = snapshot.policyRule.scope;
		lastScopeMode = snapshot.policyRule.scopeMode;
		lastIab = snapshot.iab;

		const pass = buildReconcilePass(snapshot);
		const batch: PendingMount[] = [];

		for (const entry of normalized) {
			const { script } = entry;
			const eligible = isEligible(entry, pass);
			const hasConsent = hasScriptConsent(entry, pass);
			const previousEligibility = eligibilityByScriptId.get(script.id);
			const previousConsent = consentByScriptId.get(script.id);
			eligibilityByScriptId.set(script.id, eligible);
			consentByScriptId.set(script.id, hasConsent);

			if (
				!force &&
				previousEligibility === eligible &&
				previousConsent === hasConsent &&
				!(permissionsChanged && typeof script.onConsentChange === 'function')
			) {
				continue;
			}

			if (eligible) {
				mountScript(mountDeps, script, snapshot, hasConsent, batch);
			} else {
				unmountScript(mountDeps, script, snapshot, hasConsent);
			}
		}

		flushPendingMounts(mountDeps, batch);
	};

	// Initial reconciliation — caller is already inside useEffect /
	// onMounted when invoking the factory, so this runs in the browser.
	reconcile(true);
	const unsubscribe = kernel.subscribe(() => reconcile());

	return {
		dispose() {
			unsubscribe();
			if (typeof document === 'undefined') {
				return;
			}
			for (const [scriptId, element] of loadedElements) {
				if (!ownedScriptIds.has(scriptId)) {
					continue;
				}
				if (element?.parentNode) {
					element.parentNode.removeChild(element);
				}
			}
			loadedElements.clear();
			ownedScriptIds.clear();
			elementIds.clear();
			eligibilityByScriptId.clear();
			consentByScriptId.clear();
		},
		getLoadedScriptIds() {
			return Array.from(loadedElements.keys());
		},
		updateScripts(next: Script[]) {
			const nextIds = new Set(next.map((s) => s.id));
			const snapshot = kernel.getSnapshot();
			for (const { script } of normalized) {
				if (!nextIds.has(script.id)) {
					unmountScript(mountDeps, script, snapshot, false);
					eligibilityByScriptId.delete(script.id);
					consentByScriptId.delete(script.id);
				}
			}
			normalized = normalizeScripts(next);
			reconcile(true);
		},
	};
};
