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
import { createDebugEmitter } from './debug';
import { registerScriptDiagnostics } from './diagnostics';
import type { ScriptDiagnostic, ScriptDiagnosticStatus } from './diagnostics';
import { buildReconcilePass, hasScriptConsent } from './eligibility';
import { flushPendingMounts, mountScript, unmountScript } from './mount';
import type { MountDeps } from './mount';
import { createElementIdResolver, normalizeScripts } from './normalize';
import type {
	NormalizedScript,
	PendingMount,
	Script,
	ScriptLoaderHandle,
	ScriptLoaderOptions,
	ScriptLoaderDebugEvent,
} from './types';

export {
	getScriptDiagnostics,
	subscribeScriptDiagnostics,
} from './diagnostics';
export type { ScriptDiagnostic, ScriptDiagnosticStatus } from './diagnostics';

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
	const emitDebug = createDebugEmitter({ emitToV2, onDebug });
	const hasDebugListener = !!onDebug || emitToV2;
	const lastEvents = new Map<string, ScriptLoaderDebugEvent>();
	const statuses = new Map<string, ScriptDiagnosticStatus>();
	let diagnostics: ReturnType<typeof registerScriptDiagnostics> | undefined;
	const emit = (event: ScriptLoaderDebugEvent): void => {
		lastEvents.set(event.scriptId, event);
		if (event.action === 'load_completed') {
			statuses.set(event.scriptId, 'loaded');
		} else if (event.action === 'loaded' && !statuses.has(event.scriptId)) {
			statuses.set(event.scriptId, 'loading');
		} else if (event.action === 'error') {
			statuses.set(event.scriptId, 'error');
		} else if (
			event.action === 'already_loaded' &&
			!statuses.has(event.scriptId)
		) {
			statuses.set(event.scriptId, 'present');
		} else if (event.action === 'unloaded' && event.data?.retained !== true) {
			statuses.delete(event.scriptId);
		}
		emitDebug(event);
		diagnostics?.notify(event);
	};

	let normalized: NormalizedScript[] = normalizeScripts(options.scripts);

	const loadedElements = new Map<string, HTMLScriptElement | null>();
	const retainedElements = new Map<string, HTMLScriptElement>();
	const ownedScriptIds = new Set<string>();
	const elementIds = createElementIdResolver();
	const eligibilityByScriptId = new Map<string, boolean>();
	const consentByScriptId = new Map<string, boolean>();

	const mountDeps: MountDeps = {
		elementIds,
		emit,
		getSnapshot: kernel.getSnapshot,
		hasDebugListener,
		loadedElements,
		ownedScriptIds,
		retainedElements,
	};

	// Track the last-seen consent-relevant references so a kernel tick
	// that didn't actually change consent state (e.g. only `overrides`
	// flipped) skips the full reconcile. Hot-path optimization for pages
	// with many scripts and many subscribers.
	let lastConsents: unknown = null;
	let lastPolicyCategories: unknown = null;
	let lastScopeMode: unknown = null;
	let lastIab: unknown = null;

	const reconcile = function reconcile(force = false): void {
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
			const hasConsent = hasScriptConsent(entry, pass);
			const eligible = script.alwaysLoad === true || hasConsent;
			const previousEligibility = eligibilityByScriptId.get(script.id);
			const previousConsent = consentByScriptId.get(script.id);
			eligibilityByScriptId.set(script.id, eligible);
			consentByScriptId.set(script.id, hasConsent);

			// Always-loaded integrations can map several categories (Google
			// Consent Mode), so they need updates even when mounting is unchanged.
			const needsConsentUpdate =
				script.alwaysLoad && typeof script.onConsentChange === 'function';
			if (
				!force &&
				previousEligibility === eligible &&
				previousConsent === hasConsent &&
				!needsConsentUpdate
			) {
				continue;
			}

			if (eligible) {
				retainedElements.delete(script.id);
				mountScript(mountDeps, script, snapshot, hasConsent, batch);
			} else {
				unmountScript(mountDeps, script, snapshot, hasConsent);
			}
		}

		flushPendingMounts(mountDeps, batch);
		diagnostics?.notify();
	};

	diagnostics = registerScriptDiagnostics(
		kernel,
		(loaderId): ScriptDiagnostic[] =>
			normalized.map((entry) => {
				const { script } = entry;
				const eligible = eligibilityByScriptId.get(script.id) ?? false;
				const elementId = elementIds.resolve(script);
				const retainedElement = retainedElements.get(script.id);
				const retained =
					!eligible &&
					retainedElement?.isConnected &&
					typeof document !== 'undefined' &&
					document.getElementById(elementId) === retainedElement;
				let status: ScriptDiagnosticStatus = eligible ? 'pending' : 'blocked';
				if (retained) {
					status = 'retained';
				} else if (loadedElements.has(script.id)) {
					status = statuses.get(script.id) ?? 'present';
					if (!script.src && status === 'loading') {
						status = 'loaded';
					}
				}
				return {
					alwaysLoad: script.alwaysLoad ?? false,
					callbackOnly: script.callbackOnly ?? false,
					category: script.category,
					elementId,
					eligible,
					hasConsent: hasScriptConsent(
						entry,
						buildReconcilePass(kernel.getSnapshot())
					),
					id: script.id,
					lastEvent: lastEvents.get(script.id),
					loaderId,
					persistAfterConsentRevoked:
						script.persistAfterConsentRevoked ?? false,
					src: script.src,
					status,
					vendorId: script.vendorId,
				};
			})
	);
	const unsubscribe = kernel.subscribe(() => reconcile());

	const handle: ScriptLoaderHandle = {
		dispose() {
			unsubscribe();
			diagnostics?.dispose();
			diagnostics = undefined;
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
			retainedElements.clear();
			ownedScriptIds.clear();
			elementIds.clear();
			eligibilityByScriptId.clear();
			consentByScriptId.clear();
			lastEvents.clear();
			statuses.clear();
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
					retainedElements.delete(script.id);
					eligibilityByScriptId.delete(script.id);
					consentByScriptId.delete(script.id);
					lastEvents.delete(script.id);
					statuses.delete(script.id);
				}
			}
			normalized = normalizeScripts(next);
			reconcile(true);
		},
	};
	try {
		// Observe initial mounts too, including synchronous inline execution.
		reconcile(true);
	} catch (error) {
		handle.dispose();
		throw error;
	}
	return handle;
};
