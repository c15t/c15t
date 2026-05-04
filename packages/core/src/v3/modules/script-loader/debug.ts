/**
 * Debug-event emission.
 *
 * Two paths:
 * - `onDebug` — synchronous listener supplied by the consumer.
 * - v2 compat — listeners installed on
 *   `window.__c15tScriptDebugListeners` (still consumed by the v2
 *   devtools surface). Optional and browser-only.
 *
 * Listener errors are swallowed on both paths so debug instrumentation
 * cannot break script loading.
 */
import type { ScriptLoaderDebugEvent } from './types';

/**
 * Dispatch a debug event to v2-compat listeners, if any are registered
 * on `window.__c15tScriptDebugListeners`. No-op outside the browser.
 */
export function emitV2Debug(event: ScriptLoaderDebugEvent): void {
	if (typeof window === 'undefined') return;
	const listeners = (window as unknown as Record<string, unknown>)
		.__c15tScriptDebugListeners as
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

export interface DebugEmitterOptions {
	/** Optional consumer listener. */
	onDebug?: (event: ScriptLoaderDebugEvent) => void;
	/** Whether to also dispatch to v2 window listeners. */
	emitToV2: boolean;
}

/**
 * Build the merged emit function used throughout the loader. Wraps
 * both callbacks behind a single function call site so other modules
 * don't have to know about the dual-path policy.
 */
export function createDebugEmitter(options: DebugEmitterOptions) {
	const { onDebug, emitToV2 } = options;
	return function emit(event: ScriptLoaderDebugEvent): void {
		if (onDebug) {
			try {
				onDebug(event);
			} catch {
				// Swallow consumer listener errors.
			}
		}
		if (emitToV2) emitV2Debug(event);
	};
}
