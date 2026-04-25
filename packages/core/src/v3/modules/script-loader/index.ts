/**
 * c15t/v3/modules/script-loader
 *
 * Kernel-consuming script loader. Subscribes to the kernel snapshot and
 * reconciles DOM: loads scripts that pass their consent condition,
 * unloads scripts that no longer do, fires onLoad / onError / onConsentChange
 * callbacks, honors alwaysLoad / persistAfterConsentRevoked / callbackOnly /
 * anonymizeId.
 *
 * v2 parity: `packages/core/src/libs/script-loader/{core,utils,store,types}.ts`.
 *
 * Invariants:
 * - Purely idempotent: calling createScriptLoader twice with the same
 *   scripts only mounts DOM once; the second instance's mount is a no-op
 *   for scripts already in the DOM (matched by element ID).
 * - No global state. The only "global" touched is `document.head` /
 *   `document.body` (DOM append target) and optional
 *   `window.__c15tScriptDebugListeners` for v2 debug-event compatibility.
 * - Dispose removes every element this loader mounted and disconnects
 *   the kernel subscription. Elements mounted by other loaders (or
 *   already in the DOM) are left alone.
 */
import type { ConsentState } from '../../../types/compliance';
import type { AllConsentNames } from '../../../types/consent-types';
import type {
	ConsentKernel,
	ConsentSnapshot,
	KernelIABState,
} from '../../types';
import { type HasOptions, has, hasIABConsent } from '../has';

export type {
	Script,
	ScriptCallbackInfo,
} from '../../../libs/script-loader/types';

import type {
	Script,
	ScriptCallbackInfo,
} from '../../../libs/script-loader/types';

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

function generateRandomId(): string {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
	}
	return Math.random().toString(36).slice(2, 10);
}

function emitV2Debug(event: ScriptLoaderDebugEvent): void {
	if (typeof window === 'undefined') return;
	// biome-ignore lint/suspicious/noExplicitAny: v2 debug surface
	const listeners: Set<(e: ScriptLoaderDebugEvent) => void> | undefined = (
		window as unknown as Record<string, unknown>
	).__c15tScriptDebugListeners as
		| Set<(e: ScriptLoaderDebugEvent) => void>
		| undefined;
	if (!listeners) return;
	for (const listener of listeners) {
		try {
			listener(event);
		} catch {
			// Listener errors are swallowed (v2 parity).
		}
	}
}

export function createScriptLoader(
	options: ScriptLoaderOptions
): ScriptLoaderHandle {
	const { kernel, onDebug } = options;
	const emitToV2 = options.emitToV2DebugListeners ?? true;
	let scripts: Script[] = [...options.scripts];

	// Owned state — never touches the kernel's state beyond
	// `kernel.getSnapshot`. Each loader has its own element registry.
	const loadedElements = new Map<string, HTMLScriptElement | null>();
	const scriptIdMap = new Map<string, string>();

	function emit(event: ScriptLoaderDebugEvent): void {
		if (onDebug) {
			try {
				onDebug(event);
			} catch {
				// Swallow consumer listener errors.
			}
		}
		if (emitToV2) emitV2Debug(event);
	}

	function getElementId(script: Script): string {
		const anonymize = script.anonymizeId !== false;
		if (!anonymize) return `c15t-script-${script.id}`;
		const cached = scriptIdMap.get(script.id);
		if (cached) return cached;
		const generated = `c15t-${generateRandomId()}`;
		scriptIdMap.set(script.id, generated);
		return generated;
	}

	function buildCallbackInfo(
		script: Script,
		snapshot: ConsentSnapshot,
		hasConsent: boolean,
		element?: HTMLScriptElement,
		error?: Error
	): ScriptCallbackInfo {
		return {
			id: script.id,
			elementId: getElementId(script),
			hasConsent,
			consents: snapshot.consents as ScriptCallbackInfo['consents'],
			element,
			error,
		};
	}

	function hasAnyCallback(script: Script): boolean {
		return (
			typeof script.onBeforeLoad === 'function' ||
			typeof script.onLoad === 'function' ||
			typeof script.onError === 'function' ||
			typeof script.onConsentChange === 'function'
		);
	}

	function invokeCallback<K extends keyof Script>(
		script: Script,
		key: K,
		info: ScriptCallbackInfo
	): void {
		const fn = script[key];
		if (typeof fn !== 'function') return;
		try {
			(fn as (info: ScriptCallbackInfo) => void)(info);
			emit({
				source: 'script-loader',
				scope: 'step',
				action: 'callback_invoked',
				message: `Invoked ${String(key)}`,
				scriptId: script.id,
				elementId: info.elementId,
				hasConsent: info.hasConsent,
				callback: key as ScriptLoaderDebugEvent['callback'],
				timestamp: Date.now(),
			});
		} catch (err) {
			emit({
				source: 'script-loader',
				scope: 'step',
				action: 'callback_error',
				message: `Callback ${String(key)} threw`,
				scriptId: script.id,
				elementId: info.elementId,
				callback: key as ScriptLoaderDebugEvent['callback'],
				data: { error: err instanceof Error ? err.message : String(err) },
				timestamp: Date.now(),
			});
		}
	}

	/**
	 * Per-reconcile-cycle cache of the has() options derived from the
	 * snapshot. Rebuilt only when the snapshot ref itself moves.
	 */
	interface ReconcileContext {
		snapshot: ConsentSnapshot;
		consents: ConsentState;
		hasOptions: HasOptions;
		isIabMode: boolean;
		iab: KernelIABState | null;
	}

	function buildReconcileContext(snapshot: ConsentSnapshot): ReconcileContext {
		return {
			snapshot,
			consents: snapshot.consents as ConsentState,
			hasOptions: {
				policyCategories:
					snapshot.policyCategories.length > 0
						? (snapshot.policyCategories as AllConsentNames[])
						: null,
				policyScopeMode: snapshot.policyScopeMode,
			},
			isIabMode: snapshot.model === 'iab',
			iab: snapshot.iab,
		};
	}

	function scriptIsEligible(script: Script, ctx: ReconcileContext): boolean {
		if (script.alwaysLoad) return true;

		// IAB dispatch: only fire when we're actually in IAB mode AND the
		// script declares IAB metadata. Short-circuit the expensive branch
		// for the common category-only case.
		const hasIabMeta =
			script.vendorId !== undefined ||
			(script.iabPurposes && script.iabPurposes.length > 0) ||
			(script.iabLegIntPurposes && script.iabLegIntPurposes.length > 0) ||
			(script.iabSpecialFeatures && script.iabSpecialFeatures.length > 0);

		if (ctx.isIabMode && hasIabMeta) {
			if (!ctx.iab) return false;
			return hasIABConsent(script, ctx.iab);
		}

		return has(script.category, ctx.consents, ctx.hasOptions);
	}

	function loadScript(
		script: Script,
		snapshot: ConsentSnapshot,
		hasConsent: boolean
	): void {
		if (typeof document === 'undefined') return;
		if (loadedElements.has(script.id)) {
			// Already loaded — fire onConsentChange if wired (skip the
			// callback-info allocation when nothing's listening).
			if (typeof script.onConsentChange === 'function' || onDebug) {
				const existing = loadedElements.get(script.id) ?? undefined;
				const info = buildCallbackInfo(script, snapshot, hasConsent, existing);
				invokeCallback(script, 'onConsentChange', info);
				emit({
					source: 'script-loader',
					scope: 'step',
					action: 'already_loaded',
					message: 'Script already loaded; fired onConsentChange',
					scriptId: script.id,
					elementId: info.elementId,
					hasConsent: info.hasConsent,
					timestamp: Date.now(),
				});
			}
			return;
		}

		if (script.callbackOnly === true) {
			// No DOM element — just run the lifecycle.
			const info = buildCallbackInfo(script, snapshot, hasConsent, undefined);
			invokeCallback(script, 'onBeforeLoad', info);
			invokeCallback(script, 'onLoad', info);
			loadedElements.set(script.id, null);
			emit({
				source: 'script-loader',
				scope: 'lifecycle',
				action: 'loaded',
				message: 'Callback-only script loaded',
				scriptId: script.id,
				elementId: info.elementId,
				hasConsent: info.hasConsent,
				timestamp: Date.now(),
			});
			return;
		}

		if (script.src && script.textContent) {
			throw new Error(
				`Script '${script.id}' cannot have both 'src' and 'textContent'. Choose one.`
			);
		}
		if (!script.src && !script.textContent) {
			throw new Error(
				`Script '${script.id}' must have either 'src', 'textContent', or 'callbackOnly' set to true.`
			);
		}

		const element = document.createElement('script');
		const elementId = getElementId(script);
		element.id = elementId;
		if (script.src) element.src = script.src;
		if (script.textContent) element.textContent = script.textContent;
		if (script.async !== undefined) element.async = script.async;
		if (script.defer !== undefined) element.defer = script.defer;
		if (script.nonce) element.nonce = script.nonce;
		if (script.fetchPriority) {
			// biome-ignore lint/suspicious/noExplicitAny: browser API
			(element as any).fetchPriority = script.fetchPriority;
		}
		if (script.attributes) {
			for (const [key, value] of Object.entries(script.attributes)) {
				element.setAttribute(key, value);
			}
		}

		// Only allocate the callback-info object if a callback will fire
		// or a debug listener is registered. Hot path in mount bursts.
		const infoCallers = hasAnyCallback(script) || !!onDebug;
		const info = infoCallers
			? buildCallbackInfo(script, snapshot, hasConsent, element)
			: undefined;
		if (info) invokeCallback(script, 'onBeforeLoad', info);

		// Listeners only make sense on external scripts; inline scripts
		// have no network event. Skip listener attach if nothing is going
		// to consume them.
		if (script.src && info) {
			element.addEventListener('load', () => {
				invokeCallback(script, 'onLoad', info);
			});
			element.addEventListener('error', () => {
				const errorInfo: ScriptCallbackInfo = {
					...info,
					error: new Error(`Failed to load script: ${script.src}`),
				};
				invokeCallback(script, 'onError', errorInfo);
				emit({
					source: 'script-loader',
					scope: 'lifecycle',
					action: 'error',
					message: `Script failed: ${script.src}`,
					scriptId: script.id,
					elementId,
					timestamp: Date.now(),
				});
			});
		}

		const target = script.target === 'body' ? document.body : document.head;
		target.appendChild(element);
		loadedElements.set(script.id, element);

		if (!script.src && info) {
			// Inline script: defer onLoad one tick so the browser parses
			// before the callback observes side effects.
			setTimeout(() => invokeCallback(script, 'onLoad', info), 0);
		}

		if (onDebug || emitToV2) {
			emit({
				source: 'script-loader',
				scope: 'lifecycle',
				action: 'loaded',
				message: 'Script mounted',
				scriptId: script.id,
				elementId,
				hasConsent,
				timestamp: Date.now(),
			});
		}
	}

	function unloadScript(
		script: Script,
		snapshot: ConsentSnapshot,
		hasConsent: boolean
	): void {
		const element = loadedElements.get(script.id);
		if (element === undefined) return; // never loaded by this loader

		if (script.persistAfterConsentRevoked) {
			// Element stays in DOM but we drop our reference so a later
			// re-grant re-fires callbacks rather than short-circuiting.
			loadedElements.delete(script.id);
			if (onDebug || emitToV2) {
				emit({
					source: 'script-loader',
					scope: 'lifecycle',
					action: 'unloaded',
					message: 'Script persisted after consent revoked',
					scriptId: script.id,
					elementId: getElementId(script),
					timestamp: Date.now(),
				});
			}
			return;
		}

		if (element && element.parentNode) {
			element.parentNode.removeChild(element);
		}
		loadedElements.delete(script.id);

		if (typeof script.onConsentChange === 'function') {
			const info = buildCallbackInfo(script, snapshot, hasConsent);
			invokeCallback(script, 'onConsentChange', info);
		}

		emit({
			source: 'script-loader',
			scope: 'lifecycle',
			action: 'unloaded',
			message: 'Script unmounted',
			scriptId: script.id,
			elementId: getElementId(script),
			timestamp: Date.now(),
		});
	}

	// Track the last-seen consent-relevant references. If a kernel
	// subscribe tick happens but consents / policyCategories / scopeMode
	// / iab didn't change (e.g. overrides was updated), skip the full
	// reconcile. This is a hot-path optimization for pages that have
	// many scripts and many subscribers on the kernel.
	let lastConsents: unknown = null;
	let lastPolicyCategories: unknown = null;
	let lastScopeMode: unknown = null;
	let lastIab: unknown = null;

	function reconcile(force = false): void {
		const snapshot = kernel.getSnapshot();

		// Short-circuit if nothing consent-relevant changed.
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

		const ctx = buildReconcileContext(snapshot);
		for (const script of scripts) {
			const eligible = scriptIsEligible(script, ctx);
			if (eligible) {
				loadScript(script, snapshot, true);
			} else {
				unloadScript(script, snapshot, false);
			}
		}
	}

	// Initial reconciliation — caller is already inside useEffect /
	// onMounted when invoking the factory, so this runs in the browser.
	reconcile(true);
	const unsubscribe = kernel.subscribe(() => reconcile());

	return {
		dispose() {
			unsubscribe();
			if (typeof document === 'undefined') return;
			for (const [, element] of loadedElements) {
				if (element && element.parentNode) {
					element.parentNode.removeChild(element);
				}
			}
			loadedElements.clear();
			scriptIdMap.clear();
		},
		updateScripts(next) {
			const nextIds = new Set(next.map((s) => s.id));
			// Unload scripts that were removed from the config.
			const snapshot = kernel.getSnapshot();
			for (const script of scripts) {
				if (!nextIds.has(script.id)) {
					unloadScript(script, snapshot, false);
				}
			}
			scripts = [...next];
			reconcile(true);
		},
		getLoadedScriptIds() {
			return Array.from(loadedElements.keys());
		},
	};
}
