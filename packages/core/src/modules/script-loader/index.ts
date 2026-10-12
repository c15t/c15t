import { createScriptLoaderWith } from './loader';
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
 * - `loader.ts`       — wiring + reconcile loop, written against the
 *   tools `index.ts` passes in, so it can load on demand as one chunk.
 * - `index.ts`        — this file: the public entry.
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
import { scriptLoaderTools } from './tools';
import type { ScriptLoaderHandle, ScriptLoaderOptions } from './types';

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

/**
 * Create a script loader: mounts each script whose consent condition
 * passes and unmounts it when consent is withdrawn.
 *
 * @param options - The kernel and the scripts.
 * @returns The loader handle.
 */
export const createScriptLoader = function createScriptLoader(
	options: ScriptLoaderOptions
): ScriptLoaderHandle {
	return createScriptLoaderWith(options, scriptLoaderTools);
};
