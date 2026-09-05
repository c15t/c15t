/**
 * DOM mount / unmount.
 *
 * `mountScript` creates a `<script>` element from the script config
 * (or routes through the callback-only path), then either pushes the
 * pending append onto the active batch or appends directly. The batch
 * is flushed at the end of a reconcile pass by `flushPendingMounts`,
 * which groups appends by target so each target sees one layout
 * invalidation per reconcile rather than one per script.
 *
 * `unmountScript` removes the element (or honors
 * `persistAfterConsentRevoked` and just drops our reference), then
 * fires `onConsentChange` if wired.
 */
import type { ConsentSnapshot } from '../../types';
import { buildCallbackInfo, hasAnyCallback, invokeCallback } from './callbacks';
import type { ElementIdResolver } from './normalize';
import type { PendingMount, Script, ScriptLoaderDebugEvent } from './types';

/**
 * Dependencies shared by the mount/unmount/flush helpers. The factory
 * (`createScriptLoader`) supplies these so the helpers stay free of
 * closure capture and remain testable.
 */
export interface MountDeps {
	/** Latest kernel state for callbacks completing after consent changes. */
	getSnapshot: () => ConsentSnapshot;
	/** Retained elements still observed after consent revocation. */
	retainedElements: Map<string, HTMLScriptElement>;
	/** Per-loader registry: scriptId → element (or `null` for callback-only). */
	loadedElements: Map<string, HTMLScriptElement | null>;
	/** Script IDs whose DOM element was created by this loader instance. */
	ownedScriptIds: Set<string>;
	/** Resolves the DOM `id` attribute for a script. */
	elementIds: ElementIdResolver;
	/** Debug emitter (merged onDebug + v2 compat). */
	emit: (event: ScriptLoaderDebugEvent) => void;
	/** Whether consumer or legacy debug listeners need callback metadata. */
	hasDebugListener: boolean;
}

/**
 * Mount a script into the DOM, or queue it for batched append.
 *
 * - If already loaded, fires `onConsentChange` (or skips if no listener)
 *   and emits `already_loaded`.
 * - `callbackOnly` scripts run their lifecycle without touching DOM.
 * - When `batch` is provided, the element append is deferred so the
 *   caller can flush all pending appends in a single pass.
 *
 * Throws on conflicting fields (`src && textContent` or no source at all).
 */
// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const mountScript = function mountScript(
	deps: MountDeps,
	script: Script,
	snapshot: ConsentSnapshot,
	hasConsent: boolean,
	batch: PendingMount[] | null
): void {
	if (typeof document === 'undefined') {
		return;
	}
	const elementId = deps.elementIds.resolve(script);

	if (deps.loadedElements.has(script.id)) {
		// Already loaded — fire onConsentChange if wired (skip the info
		// allocation when nothing would consume it).
		if (typeof script.onConsentChange === 'function' || deps.hasDebugListener) {
			const existing = deps.loadedElements.get(script.id) ?? undefined;
			const info = buildCallbackInfo(
				script,
				snapshot,
				hasConsent,
				elementId,
				existing
			);
			invokeCallback(script, 'onConsentChange', info, deps.emit);
		}
		deps.emit({
			action: 'already_loaded',
			elementId,
			hasConsent,
			message: 'Script already mounted',
			scope: 'step',
			scriptId: script.id,
			source: 'script-loader',
			timestamp: Date.now(),
		});
		return;
	}

	if (script.callbackOnly === true) {
		const info = buildCallbackInfo(
			script,
			snapshot,
			hasConsent,
			elementId,
			undefined
		);
		invokeCallback(script, 'onBeforeLoad', info, deps.emit);
		invokeCallback(script, 'onLoad', info, deps.emit);
		deps.loadedElements.set(script.id, null);
		deps.emit({
			action: 'loaded',
			elementId: info.elementId,
			hasConsent: info.hasConsent,
			message: 'Callback-only script loaded',
			scope: 'lifecycle',
			scriptId: script.id,
			source: 'script-loader',
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

	const existingElement =
		typeof document.getElementById === 'function'
			? document.getElementById(elementId)
			: null;
	if (existingElement) {
		const element = existingElement as HTMLScriptElement;
		deps.loadedElements.set(script.id, element);
		if (typeof script.onConsentChange === 'function' || deps.hasDebugListener) {
			const info = buildCallbackInfo(
				script,
				snapshot,
				hasConsent,
				elementId,
				element
			);
			invokeCallback(script, 'onConsentChange', info, deps.emit);
		}
		deps.emit({
			action: 'already_loaded',
			elementId,
			hasConsent,
			message: 'Script element already exists in DOM; reused it',
			scope: 'step',
			scriptId: script.id,
			source: 'script-loader',
			timestamp: Date.now(),
		});
		return;
	}

	const element = document.createElement('script');
	element.id = elementId;
	if (script.src) {
		element.src = script.src;
	}
	if (script.textContent) {
		element.textContent = script.textContent;
	}
	if (script.async !== undefined) {
		element.async = script.async;
	}
	if (script.defer !== undefined) {
		element.defer = script.defer;
	}
	if (script.nonce) {
		element.nonce = script.nonce;
	}
	if (script.fetchPriority) {
		// oxlint-disable-next-line typescript/no-explicit-any -- browser API not yet in lib.dom
		(element as any).fetchPriority = script.fetchPriority;
	}
	if (script.attributes) {
		for (const [key, value] of Object.entries(script.attributes)) {
			element.setAttribute(
				key,
				typeof value === 'string' ? value : String(value)
			);
		}
	}

	// Only allocate the callback-info object if a callback will fire or a
	// debug listener is registered. Hot path in mount bursts.
	const infoCallers = hasAnyCallback(script) || deps.hasDebugListener;
	const info = infoCallers
		? buildCallbackInfo(script, snapshot, hasConsent, elementId, element)
		: undefined;
	if (info) {
		invokeCallback(script, 'onBeforeLoad', info, deps.emit);
	}

	// Listeners only make sense on external scripts; inline scripts have
	// no network event. Diagnostics still need events without user callbacks.
	if (script.src) {
		const isCurrentElement = () =>
			element.isConnected &&
			document.getElementById(elementId) === element &&
			(deps.loadedElements.get(script.id) === element ||
				deps.retainedElements.get(script.id) === element);
		const completionInfo = () =>
			info && deps.retainedElements.get(script.id) === element
				? buildCallbackInfo(
						script,
						deps.getSnapshot(),
						false,
						elementId,
						element
					)
				: info;
		element.addEventListener('load', () => {
			if (!isCurrentElement()) {
				return;
			}
			const currentInfo = completionInfo();
			if (currentInfo) {
				invokeCallback(script, 'onLoad', currentInfo, deps.emit);
			}
			deps.emit({
				action: 'load_completed',
				elementId,
				message: 'Script finished loading',
				scope: 'lifecycle',
				scriptId: script.id,
				source: 'script-loader',
				timestamp: Date.now(),
			});
		});
		element.addEventListener('error', () => {
			if (!isCurrentElement()) {
				return;
			}
			const currentInfo = completionInfo();
			if (currentInfo) {
				const errorInfo = {
					...currentInfo,
					error: new Error(`Failed to load script: ${script.src}`),
				};
				invokeCallback(script, 'onError', errorInfo, deps.emit);
			}
			deps.emit({
				action: 'error',
				elementId,
				message: `Script failed: ${script.src}`,
				scope: 'lifecycle',
				scriptId: script.id,
				source: 'script-loader',
				timestamp: Date.now(),
			});
		});
	}

	const target = script.target === 'body' ? document.body : document.head;

	if (batch) {
		batch.push({ element, elementId, hasConsent, info, script, target });
		return;
	}

	deps.loadedElements.set(script.id, element);
	deps.ownedScriptIds.add(script.id);
	target.appendChild(element);
	if (deps.loadedElements.get(script.id) !== element) {
		return;
	}

	if (!script.src && info) {
		// Inline script: defer onLoad one tick so the browser parses
		// before the callback observes side effects.
		setTimeout(() => invokeCallback(script, 'onLoad', info, deps.emit), 0);
	}

	deps.emit({
		action: 'loaded',
		elementId,
		hasConsent,
		message: 'Script mounted',
		scope: 'lifecycle',
		scriptId: script.id,
		source: 'script-loader',
		timestamp: Date.now(),
	});
};

/**
 * Unmount a script. Honors `persistAfterConsentRevoked` (DOM stays,
 * but our registry reference is dropped so a later re-grant re-fires
 * callbacks).
 *
 * Fires `onConsentChange` after detaching so consumers can react to
 * the consent transition.
 */
export const unmountScript = function unmountScript(
	deps: MountDeps,
	script: Script,
	snapshot: ConsentSnapshot,
	hasConsent: boolean
): void {
	const element = deps.loadedElements.get(script.id);
	if (element === undefined) {
		return;
	}

	const elementId = deps.elementIds.resolve(script);

	if (script.persistAfterConsentRevoked) {
		if (element) {
			deps.retainedElements.set(script.id, element);
		}
		// Element stays in DOM but we drop our reference so a later
		// re-grant re-fires callbacks rather than short-circuiting.
		deps.loadedElements.delete(script.id);
		deps.ownedScriptIds.delete(script.id);
		if (typeof script.onConsentChange === 'function') {
			const info = buildCallbackInfo(
				script,
				snapshot,
				hasConsent,
				elementId,
				element ?? undefined
			);
			invokeCallback(script, 'onConsentChange', info, deps.emit);
		}
		deps.emit({
			action: 'unloaded',
			data: { retained: true },
			elementId,
			message: 'Script persisted after consent revoked',
			scope: 'lifecycle',
			scriptId: script.id,
			source: 'script-loader',
			timestamp: Date.now(),
		});
		return;
	}

	const ownsElement = deps.ownedScriptIds.has(script.id);
	if (ownsElement && element?.parentNode) {
		element.parentNode.removeChild(element);
	}
	deps.loadedElements.delete(script.id);
	deps.ownedScriptIds.delete(script.id);

	if (typeof script.onConsentChange === 'function') {
		const info = buildCallbackInfo(script, snapshot, hasConsent, elementId);
		invokeCallback(script, 'onConsentChange', info, deps.emit);
	}

	deps.emit({
		action: 'unloaded',
		elementId,
		message: 'Script unmounted',
		scope: 'lifecycle',
		scriptId: script.id,
		source: 'script-loader',
		timestamp: Date.now(),
	});
};

/**
 * Append every pending mount to its target in batched form.
 *
 * Strategy: group elements by append target. If a target only has one
 * element, append directly. If a target has multiple, build a single
 * `DocumentFragment` and append the fragment so the browser parses /
 * inserts in one pass.
 *
 * After append, walks each pending entry to register the loaded element,
 * defer inline `onLoad` (one tick) so the browser parses first, and
 * emit the lifecycle event.
 */
export const flushPendingMounts = function flushPendingMounts(
	deps: MountDeps,
	batch: PendingMount[]
): void {
	if (batch.length === 0) {
		return;
	}
	// Register before insertion: inline execution and DOM adapters can dispatch
	// load events synchronously while the element is being appended.
	for (const pending of batch) {
		deps.loadedElements.set(pending.script.id, pending.element);
		deps.ownedScriptIds.add(pending.script.id);
	}

	if (batch.length === 1) {
		// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
		const only = batch[0];
		if (!only) {
			return;
		}
		only.target.appendChild(only.element);
	} else {
		const byTarget = new Map<HTMLElement, PendingMount[]>();
		for (const pending of batch) {
			const list = byTarget.get(pending.target);
			if (list) {
				list.push(pending);
			} else {
				byTarget.set(pending.target, [pending]);
			}
		}
		for (const [target, entries] of byTarget) {
			// A previous target can execute inline code that revokes consent or
			// replaces this loader's scripts. Never insert invalidated entries.
			const elements = entries
				.filter(
					({ script, element }) =>
						deps.loadedElements.get(script.id) === element
				)
				.map(({ element }) => element);
			if (elements.length === 0) {
				continue;
			}
			if (elements.length === 1) {
				// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
				const first = elements[0];
				if (first) {
					target.appendChild(first);
				}
				continue;
			}
			const fragment = document.createDocumentFragment();
			for (const element of elements) {
				fragment.appendChild(element);
			}
			target.appendChild(fragment);
		}
	}

	for (const pending of batch) {
		if (deps.loadedElements.get(pending.script.id) !== pending.element) {
			continue;
		}
		if (!pending.script.src && pending.info) {
			const { info } = pending;
			const { script } = pending;
			setTimeout(() => invokeCallback(script, 'onLoad', info, deps.emit), 0);
		}

		deps.emit({
			action: 'loaded',
			elementId: pending.elementId,
			hasConsent: pending.hasConsent,
			message: 'Script mounted',
			scope: 'lifecycle',
			scriptId: pending.script.id,
			source: 'script-loader',
			timestamp: Date.now(),
		});
	}
};
