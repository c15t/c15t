/**
 * Script lifecycle callback dispatch.
 *
 * Builds the `ScriptCallbackInfo` payload, decides whether any callback
 * is wired (so callers can skip allocating the info object on the hot
 * path), and invokes a single named callback while routing successes /
 * errors through the debug emitter.
 *
 * Pure-ish: `invokeCallback` calls user-supplied functions and may
 * therefore have side effects, but contains no DOM or kernel access of
 * its own.
 */
import type { ConsentSnapshot } from '../../types';
import type {
	Script,
	ScriptCallbackInfo,
	ScriptLoaderDebugEvent,
} from './types';

/**
 * Build the `ScriptCallbackInfo` payload exposed to user callbacks.
 * Pure: same input always produces the same output. The element ID
 * comes from the resolver passed in — keeps anonymized-ID logic out
 * of this module.
 */
export function buildCallbackInfo(
	script: Script,
	snapshot: ConsentSnapshot,
	hasConsent: boolean,
	elementId: string,
	element?: HTMLScriptElement,
	error?: Error
): ScriptCallbackInfo {
	return {
		id: script.id,
		elementId,
		hasConsent,
		consents: snapshot.consents as ScriptCallbackInfo['consents'],
		element,
		error,
	};
}

/**
 * True if at least one of the four lifecycle callbacks is wired on the
 * script. Used as a hot-path guard so we skip allocating the
 * `ScriptCallbackInfo` payload when nothing would consume it.
 */
export function hasAnyCallback(script: Script): boolean {
	return (
		typeof script.onBeforeLoad === 'function' ||
		typeof script.onLoad === 'function' ||
		typeof script.onError === 'function' ||
		typeof script.onConsentChange === 'function'
	);
}

/**
 * Invoke a single named callback on `script`, routing success /
 * thrown-error into the debug emitter. No-op when the callback is
 * not a function. User errors are swallowed so a buggy callback
 * cannot break the reconcile loop.
 */
export function invokeCallback<K extends keyof Script>(
	script: Script,
	key: K,
	info: ScriptCallbackInfo,
	emit: (event: ScriptLoaderDebugEvent) => void
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
