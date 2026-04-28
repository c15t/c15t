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
	/** Per-loader registry: scriptId → element (or `null` for callback-only). */
	loadedElements: Map<string, HTMLScriptElement | null>;
	/** Resolves the DOM `id` attribute for a script. */
	elementIds: ElementIdResolver;
	/** Debug emitter (merged onDebug + v2 compat). */
	emit: (event: ScriptLoaderDebugEvent) => void;
	/** True if any debug consumer is wired. Skip allocating
	 * lifecycle events when false. */
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
export function mountScript(
	deps: MountDeps,
	script: Script,
	snapshot: ConsentSnapshot,
	hasConsent: boolean,
	batch: PendingMount[] | null
): void {
	if (typeof document === 'undefined') return;
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
			deps.emit({
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
	element.id = elementId;
	if (script.src) element.src = script.src;
	if (script.textContent) element.textContent = script.textContent;
	if (script.async !== undefined) element.async = script.async;
	if (script.defer !== undefined) element.defer = script.defer;
	if (script.nonce) element.nonce = script.nonce;
	if (script.fetchPriority) {
		// biome-ignore lint/suspicious/noExplicitAny: browser API not yet in lib.dom
		(element as any).fetchPriority = script.fetchPriority;
	}
	if (script.attributes) {
		for (const [key, value] of Object.entries(script.attributes)) {
			element.setAttribute(key, value);
		}
	}

	// Only allocate the callback-info object if a callback will fire or a
	// debug listener is registered. Hot path in mount bursts.
	const infoCallers = hasAnyCallback(script) || deps.hasDebugListener;
	const info = infoCallers
		? buildCallbackInfo(script, snapshot, hasConsent, elementId, element)
		: undefined;
	if (info) invokeCallback(script, 'onBeforeLoad', info, deps.emit);

	// Listeners only make sense on external scripts; inline scripts have
	// no network event. Skip listener attach when no callback consumes it.
	if (script.src && info) {
		element.addEventListener('load', () => {
			invokeCallback(script, 'onLoad', info, deps.emit);
		});
		element.addEventListener('error', () => {
			const errorInfo = {
				...info,
				error: new Error(`Failed to load script: ${script.src}`),
			};
			invokeCallback(script, 'onError', errorInfo, deps.emit);
			deps.emit({
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

	if (batch) {
		batch.push({ script, element, target, elementId, hasConsent, info });
		return;
	}

	target.appendChild(element);
	deps.loadedElements.set(script.id, element);

	if (!script.src && info) {
		// Inline script: defer onLoad one tick so the browser parses
		// before the callback observes side effects.
		setTimeout(() => invokeCallback(script, 'onLoad', info, deps.emit), 0);
	}

	if (deps.hasDebugListener) {
		deps.emit({
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

/**
 * Unmount a script. Honors `persistAfterConsentRevoked` (DOM stays,
 * but our registry reference is dropped so a later re-grant re-fires
 * callbacks).
 *
 * Fires `onConsentChange` after detaching so consumers can react to
 * the consent transition.
 */
export function unmountScript(
	deps: MountDeps,
	script: Script,
	snapshot: ConsentSnapshot,
	hasConsent: boolean
): void {
	const element = deps.loadedElements.get(script.id);
	if (element === undefined) return;

	const elementId = deps.elementIds.resolve(script);

	if (script.persistAfterConsentRevoked) {
		// Element stays in DOM but we drop our reference so a later
		// re-grant re-fires callbacks rather than short-circuiting.
		deps.loadedElements.delete(script.id);
		if (deps.hasDebugListener) {
			deps.emit({
				source: 'script-loader',
				scope: 'lifecycle',
				action: 'unloaded',
				message: 'Script persisted after consent revoked',
				scriptId: script.id,
				elementId,
				timestamp: Date.now(),
			});
		}
		return;
	}

	if (element && element.parentNode) {
		element.parentNode.removeChild(element);
	}
	deps.loadedElements.delete(script.id);

	if (typeof script.onConsentChange === 'function') {
		const info = buildCallbackInfo(script, snapshot, hasConsent, elementId);
		invokeCallback(script, 'onConsentChange', info, deps.emit);
	}

	deps.emit({
		source: 'script-loader',
		scope: 'lifecycle',
		action: 'unloaded',
		message: 'Script unmounted',
		scriptId: script.id,
		elementId,
		timestamp: Date.now(),
	});
}

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
export function flushPendingMounts(
	deps: MountDeps,
	batch: PendingMount[]
): void {
	if (batch.length === 0) return;

	if (batch.length === 1) {
		const only = batch[0];
		if (!only) return;
		only.target.appendChild(only.element);
	} else {
		const byTarget = new Map<HTMLElement, HTMLScriptElement[]>();
		for (const pending of batch) {
			const list = byTarget.get(pending.target);
			if (list) list.push(pending.element);
			else byTarget.set(pending.target, [pending.element]);
		}
		for (const [target, elements] of byTarget) {
			if (elements.length === 1) {
				const first = elements[0];
				if (first) target.appendChild(first);
				continue;
			}
			const fragment = document.createDocumentFragment();
			for (const element of elements) fragment.appendChild(element);
			target.appendChild(fragment);
		}
	}

	for (const pending of batch) {
		deps.loadedElements.set(pending.script.id, pending.element);

		if (!pending.script.src && pending.info) {
			const info = pending.info;
			const script = pending.script;
			setTimeout(() => invokeCallback(script, 'onLoad', info, deps.emit), 0);
		}

		if (deps.hasDebugListener) {
			deps.emit({
				source: 'script-loader',
				scope: 'lifecycle',
				action: 'loaded',
				message: 'Script mounted',
				scriptId: pending.script.id,
				elementId: pending.elementId,
				hasConsent: pending.hasConsent,
				timestamp: Date.now(),
			});
		}
	}
}
