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
import { extractConsentNamesFromCondition } from '../../libs/has';
import { declareOwnedVendors } from '../../libs/vendors';
import type { ConsentSnapshot } from '../../types';
import { getEffectiveGateState } from '../has';
import { buildCallbackInfo, invokeCallback } from './callbacks';
import { createDebugEmitter } from './debug';
import { registerScriptDiagnostics } from './diagnostics';
import type { ScriptDiagnostic, ScriptDiagnosticStatus } from './diagnostics';
import { buildReconcilePass, hasScriptConsent } from './eligibility';
import { flushPendingMounts, mountScript, unmountScript } from './mount';
import type { MountDeps } from './mount';
import {
	createElementIdResolver,
	hasSameResource,
	normalizeScripts,
} from './normalize';
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

const MAX_RECONCILE_PASSES = 100;

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

	const registerCategories = (scripts: Script[]) => {
		kernel.set.registerConsentCategories(
			scripts.flatMap((script) =>
				extractConsentNamesFromCondition(script.category)
			)
		);
		declareOwnedVendors(kernel, scripts);
	};
	registerCategories(options.scripts);
	let normalized: NormalizedScript[] = normalizeScripts(options.scripts);

	const loadedElements = new Map<string, HTMLScriptElement | null>();
	const retainedElements = new Map<string, HTMLScriptElement>();
	const ownedScriptIds = new Set<string>();
	const elementIds = createElementIdResolver();
	const eligibilityByScriptId = new Map<string, boolean>();
	const consentByScriptId = new Map<string, boolean>();

	let unsubscribe: (() => void) | undefined;
	let disposed = false;
	let processing = false;
	let pendingScripts: Script[] | undefined;
	let reconcileRequested = false;
	let forceReconcile = false;

	// A callback can request changes while this pass is still mounting scripts.
	const isCurrentPass = () =>
		!disposed && pendingScripts === undefined && !reconcileRequested;

	const mountDeps: MountDeps = {
		elementIds,
		emit,
		getCurrentScript: (scriptId, snapshot) => {
			const entry = normalized.find(({ script }) => script.id === scriptId);
			return entry
				? {
						hasConsent: hasScriptConsent(entry, buildReconcilePass(snapshot)),
						script: entry.script,
					}
				: undefined;
		},
		getSnapshot: kernel.getSnapshot,
		hasDebugListener,
		isDisposed: () => disposed,
		loadedElements,
		nonce: options.nonce,
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
	let lastRestrictions: unknown = null;
	let lastModel: unknown = null;
	let lastEvaluationPolicy: unknown = null;
	let lastVendorChoice: unknown = null;
	let lastVendors: unknown = null;

	const isConsentStateUnchanged = (snapshot: ConsentSnapshot): boolean => {
		const effective = getEffectiveGateState(snapshot);
		return (
			effective.effectivePermissions === lastConsents &&
			snapshot.policyRule.scope === lastPolicyCategories &&
			snapshot.policyRule.scopeMode === lastScopeMode &&
			snapshot.iab === lastIab &&
			effective.restrictions === lastRestrictions &&
			snapshot.model === lastModel &&
			snapshot.evaluationPolicy === lastEvaluationPolicy &&
			snapshot.vendorChoice === lastVendorChoice &&
			snapshot.vendors === lastVendors
		);
	};

	const reconcile = function reconcile(force = false): void {
		const snapshot: ConsentSnapshot = kernel.getSnapshot();
		const effective = getEffectiveGateState(snapshot);
		const permissionsChanged = effective.effectivePermissions !== lastConsents;

		if (!force && isConsentStateUnchanged(snapshot)) {
			return;
		}
		lastVendorChoice = snapshot.vendorChoice;
		lastVendors = snapshot.vendors;
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
			const hasConsent = hasScriptConsent(entry, pass);
			const eligible = script.alwaysLoad === true || hasConsent;
			const previousEligibility = eligibilityByScriptId.get(script.id);
			const previousConsent = consentByScriptId.get(script.id);
			eligibilityByScriptId.set(script.id, eligible);
			consentByScriptId.set(script.id, hasConsent);

			// Always-loaded integrations can map several categories (Google
			// Consent Mode), so they need updates even when mounting is unchanged.
			if (
				!force &&
				previousEligibility === eligible &&
				previousConsent === hasConsent &&
				!(permissionsChanged && typeof script.onConsentChange === 'function')
			) {
				continue;
			}

			if (eligible) {
				retainedElements.delete(script.id);
				mountScript(
					mountDeps,
					script,
					snapshot,
					hasConsent,
					batch,
					isCurrentPass
				);
			} else {
				unmountScript(mountDeps, script, snapshot, hasConsent);
			}
			if (!isCurrentPass()) {
				break;
			}
		}

		flushPendingMounts(mountDeps, batch, isCurrentPass);
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
					vendor: script.vendor,
					vendorId: script.vendorId,
				};
			})
	);
	const disposeScript = (
		script: Script,
		element = loadedElements.get(script.id) ?? retainedElements.get(script.id)
	): void => {
		if (!script.onDispose) {
			return;
		}
		const snapshot = kernel.getSnapshot();
		invokeCallback(
			script,
			'onDispose',
			buildCallbackInfo(
				script,
				snapshot,
				consentByScriptId.get(script.id) ?? false,
				elementIds.resolve(script),
				element
			),
			emit
		);
	};

	const cleanup = (): void => {
		// Clear registrations before user callbacks. Each object owns one cleanup
		// per registration, even if it appears more than once in the input.
		const scripts = new Set(normalized.map(({ script }) => script));
		normalized = [];
		pendingScripts = undefined;
		for (const script of scripts) {
			disposeScript(script);
		}
		diagnostics?.dispose();
		diagnostics = undefined;
		for (const [scriptId, element] of new Map([
			...retainedElements,
			...loadedElements,
		])) {
			if (ownedScriptIds.has(scriptId) && element?.parentNode) {
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
	};

	const replaceScripts = (next: Script[]): void => {
		const nextScripts = new Set(next);
		const nextById = new Map(next.map((script) => [script.id, script]));
		const previous = new Set(normalized.map(({ script }) => script));
		const snapshot = kernel.getSnapshot();
		for (const script of previous) {
			if (nextScripts.has(script)) {
				continue;
			}
			const replacement = nextById.get(script.id);
			// Existing vendor helpers are recreated on framework rerenders. Keep
			// their resource mounted unless it changed. onDispose opts into an
			// object-owned lifecycle, used by integrations with attached listeners.
			if (
				replacement &&
				!script.onDispose &&
				!replacement.onDispose &&
				hasSameResource(script, replacement)
			) {
				continue;
			}
			// Resource replacement starts a fresh lifecycle, even for the same ID.
			// Persistence applies to consent revocation, not config replacement.
			const element =
				loadedElements.get(script.id) ?? retainedElements.get(script.id);
			unmountScript(mountDeps, script, snapshot, false, true);
			disposeScript(script, element);
			retainedElements.delete(script.id);
			eligibilityByScriptId.delete(script.id);
			consentByScriptId.delete(script.id);
			lastEvents.delete(script.id);
			statuses.delete(script.id);
		}
		normalized = normalizeScripts(next);
		if (!disposed) {
			registerCategories(next);
			reconcileRequested = true;
			forceReconcile = true;
		}
	};

	// Serialize lifecycle changes. Callbacks can request another configuration
	// or dispose the loader without recursively cleaning up the current one.
	const drain = (): void => {
		if (processing) {
			return;
		}
		processing = true;
		let passes = 0;
		try {
			while (pendingScripts || reconcileRequested) {
				if (disposed) {
					break;
				}
				passes += 1;
				if (passes > MAX_RECONCILE_PASSES) {
					disposed = true;
					unsubscribe?.();
					unsubscribe = undefined;
					emit({
						action: 'error',
						message: 'Script callback feedback loop detected; loader disposed',
						scope: 'phase',
						scriptId: '',
						source: 'script-loader',
						timestamp: Date.now(),
					});
					break;
				}
				if (pendingScripts) {
					const next = pendingScripts;
					pendingScripts = undefined;
					replaceScripts(next);
				} else {
					const force = forceReconcile;
					reconcileRequested = false;
					forceReconcile = false;
					reconcile(force);
				}
			}
		} finally {
			if (disposed) {
				cleanup();
			}
			processing = false;
		}
	};
	unsubscribe = kernel.subscribe(() => {
		if (processing && isConsentStateUnchanged(kernel.getSnapshot())) {
			return;
		}
		// Revisit mounts skipped when a callback interrupts the active pass,
		// even if their eligibility is unchanged in the next snapshot.
		forceReconcile ||= processing;
		reconcileRequested = true;
		drain();
	});
	const handle: ScriptLoaderHandle = {
		dispose() {
			if (disposed) {
				return;
			}
			disposed = true;
			unsubscribe?.();
			unsubscribe = undefined;
			drain();
		},
		getLoadedScriptIds() {
			return Array.from(loadedElements.keys());
		},
		updateScripts(next: Script[]) {
			if (disposed) {
				return;
			}
			registerCategories(next);
			pendingScripts = next;
			drain();
		},
	};
	try {
		// Observe initial mounts too, including synchronous inline execution.
		reconcileRequested = true;
		forceReconcile = true;
		drain();
	} catch (error) {
		handle.dispose();
		throw error;
	}
	return handle;
};
