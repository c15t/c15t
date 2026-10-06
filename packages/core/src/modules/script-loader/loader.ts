/**
 * The script loader, written against {@link ScriptLoaderTools}: it imports
 * nothing the first-load graph has, so it can load on demand as one chunk.
 * `index.ts` is the public entry and passes the shared implementations.
 */
import type { ConsentSnapshot } from '../../types';
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
	ScriptLoaderTools,
} from './types';

const MAX_RECONCILE_PASSES = 100;

/**
 * Create a script loader from the tools it calls.
 *
 * @param options - The kernel and the scripts.
 * @param tools - The shared consent and vendor functions.
 * @returns The loader handle.
 * @internal
 */
export const createScriptLoaderWith = function createScriptLoaderWith(
	options: ScriptLoaderOptions,
	tools: ScriptLoaderTools
): ScriptLoaderHandle {
	const { categoriesOf, declareOwners, forgetOwners, gateState, isVendorId } =
		tools;
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

	const ownerSource = Symbol('script-loader');
	const registerCategories = (scripts: Script[]) => {
		kernel.set.registerConsentCategories(
			scripts.flatMap((script) => categoriesOf(script.category))
		);
		declareOwners(kernel, scripts, ownerSource);
	};
	registerCategories(options.scripts);
	let normalized: NormalizedScript[] = normalizeScripts(
		options.scripts,
		isVendorId
	);

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
						hasConsent: hasScriptConsent(
							entry,
							buildReconcilePass(snapshot, tools)
						),
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
		tools,
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
		const effective = gateState(snapshot);
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

	// Another source can sweep this loader's slugs out of the declared set: a
	// provider replacing its own script entries, or a backend init dropping a
	// vendor a script here still names. A mounted loader's scripts own their
	// slugs for as long as they are configured, so put them back before the
	// gate runs; a stored denial for one of them would otherwise be ignored
	// for the pass. Idempotent: nothing missing means no commit.
	const declareMissingVendors = (snapshot: ConsentSnapshot): void => {
		const declared = new Set(
			snapshot.vendors?.declared.map((vendor) => vendor.id)
		);
		const missing = normalized.some(
			({ vendor }) => vendor !== null && !declared.has(vendor)
		);
		if (missing) {
			declareOwners(
				kernel,
				normalized.map(({ script }) => script),
				ownerSource
			);
		}
	};

	const reconcile = function reconcile(force = false): void {
		let snapshot: ConsentSnapshot = kernel.getSnapshot();
		if (snapshot.vendors !== lastVendors) {
			declareMissingVendors(snapshot);
			snapshot = kernel.getSnapshot();
		}
		const effective = gateState(snapshot);
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

		const pass = buildReconcilePass(snapshot, tools);
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
						buildReconcilePass(kernel.getSnapshot(), tools)
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
				tools,
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
		forgetOwners(kernel, ownerSource);
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
		normalized = normalizeScripts(next, isVendorId);
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
