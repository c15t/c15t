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
export const buildCallbackInfo = function buildCallbackInfo(
	script: Script,
	snapshot: ConsentSnapshot,
	hasConsent: boolean,
	elementId: string,
	element?: HTMLScriptElement,
	error?: Error
): ScriptCallbackInfo {
	return {
		consents: snapshot.consents as ScriptCallbackInfo['consents'],
		element,
		elementId,
		error,
		hasConsent,
		id: script.id,
	};
};

/**
 * True if at least one of the four lifecycle callbacks is wired on the
 * script. Used as a hot-path guard so we skip allocating the
 * `ScriptCallbackInfo` payload when nothing would consume it.
 */
export const hasAnyCallback = function hasAnyCallback(script: Script): boolean {
	return (
		typeof script.onBeforeLoad === 'function' ||
		typeof script.onLoad === 'function' ||
		typeof script.onError === 'function' ||
		typeof script.onConsentChange === 'function'
	);
};

/**
 * Invoke a single named callback on `script`, routing success /
 * thrown-error into the debug emitter. No-op when the callback is
 * not a function. User errors are swallowed so a buggy callback
 * cannot break the reconcile loop.
 */
export const invokeCallback = function invokeCallback<K extends keyof Script>(
	script: Script,
	key: K,
	info: ScriptCallbackInfo,
	emit: (event: ScriptLoaderDebugEvent) => void
): void {
	const fn = script[key];
	if (typeof fn !== 'function') {
		return;
	}
	try {
		(fn as (info: ScriptCallbackInfo) => void)(info);
		emit({
			action: 'callback_invoked',
			callback: key as ScriptLoaderDebugEvent['callback'],
			elementId: info.elementId,
			hasConsent: info.hasConsent,
			message: `Invoked ${String(key)}`,
			scope: 'step',
			scriptId: script.id,
			source: 'script-loader',
			timestamp: Date.now(),
		});
	} catch (err) {
		emit({
			action: 'callback_error',
			callback: key as ScriptLoaderDebugEvent['callback'],
			data: { error: err instanceof Error ? err.message : String(err) },
			elementId: info.elementId,
			message: `Callback ${String(key)} threw`,
			scope: 'step',
			scriptId: script.id,
			source: 'script-loader',
			timestamp: Date.now(),
		});
	}
};
