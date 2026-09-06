/**
 * `@c15t/core/modules/window-debug`
 *
 * Client-only debug and adapter identification module. Installs a tiny,
 * read-only `window.c15t` object for browser inspection after a framework
 * adapter has mounted. This is the v3 successor to v2's `window.c15tStore`
 * exposure, but intentionally exposes only static public metadata
 * (`version`, `pkg`, `mode`) instead of the mutable store.
 *
 * Concerns are split across siblings:
 * - `types.ts` — public type definitions.
 * - `index.ts` — this file: installation + lifecycle.
 *
 * Invariants:
 * - Isomorphic-safe: in non-browser environments the handle is inert.
 * - Best-effort: if a host page defined `window.c15t` as non-writable,
 *   install/dispose degrade to no-ops instead of throwing — this hook
 *   must never take the consent provider down with it. Adapters that
 *   call it synchronously during mount (Vue, Svelte) rely on this.
 * - Last writer wins: mounting a newer provider replaces `window.c15t`.
 * - Dispose is identity-checked so an older handle cannot remove a newer
 *   provider's debug object.
 * - The installed object is frozen.
 */
import { version } from '../../version';
import type {
	C15tWindowDebug,
	WindowDebugHandle,
	WindowDebugMode,
	WindowDebugModeInput,
	WindowDebugOptions,
} from './types';

export type {
	C15tWindowDebug,
	WindowDebugHandle,
	WindowDebugMode,
	WindowDebugModeInput,
	WindowDebugOptions,
} from './types';

/**
 * Resolves the {@link WindowDebugMode} to report for a provider-style
 * adapter (React, Svelte, Next.js). Shared so adapters cannot drift from
 * the transport factory's declared kind.
 *
 * Vue resolves its own mode (`manifest` vs `hosted`) — its config has
 * no provider-mode concept.
 *
 * @param mode - The adapter's provider transport factory metadata.
 * @returns The transport kind to report on `window.c15t`.
 */
export const resolveWindowDebugMode = function resolveWindowDebugMode(
	mode: WindowDebugModeInput
): WindowDebugMode {
	return mode.kind;
};

type WindowWithC15tDebug = Window & {
	c15t?: C15tWindowDebug;
};

const inertHandle: WindowDebugHandle = {
	dispose() {
		/* empty */
	},
};

/**
 * Installs a frozen `window.c15t` debug object describing the mounted
 * c15t adapter: `{ version, pkg, mode }`.
 *
 * @param options - The adapter identity to report: `pkg` (installed
 * adapter package name) and `mode` (resolved transport kind).
 * @returns A handle whose `dispose()` removes `window.c15t` — only if it
 * still is the object this call installed. Inert outside the browser or
 * when the page blocks the write.
 *
 * @example
 * ```ts
 * const handle = createWindowDebug({ pkg: '@c15t/react', mode: 'hosted' });
 * // window.c15t -> { version: '2.1.0', pkg: '@c15t/react', mode: 'hosted' }
 * handle.dispose();
 * ```
 */
export const createWindowDebug = function createWindowDebug(
	options: WindowDebugOptions
): WindowDebugHandle {
	if (typeof window === 'undefined') {
		return inertHandle;
	}

	const target = window as WindowWithC15tDebug;
	const installed: C15tWindowDebug = Object.freeze({
		mode: options.mode,
		pkg: options.pkg,
		version,
	});

	try {
		target.c15t = installed;
	} catch {
		// A host page defined `window.c15t` as non-writable — strict-mode
		// assignment throws. The debug hook is best-effort; never let it
		// abort a provider that installs it synchronously during mount.
		return inertHandle;
	}

	return {
		dispose() {
			if (target.c15t === installed) {
				try {
					delete target.c15t;
				} catch {
					// Non-configurable property — leave it in place.
				}
			}
		},
	};
};
