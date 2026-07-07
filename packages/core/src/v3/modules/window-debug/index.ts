/**
 * c15t/v3/modules/window-debug
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
 * - Last writer wins: mounting a newer provider replaces `window.c15t`.
 * - Dispose is identity-checked so an older handle cannot remove a newer
 *   provider's debug object.
 * - The installed object is frozen.
 */
import { version } from '../../../version';
import type {
	C15tWindowDebug,
	WindowDebugHandle,
	WindowDebugOptions,
} from './types';

export type {
	C15tWindowDebug,
	WindowDebugHandle,
	WindowDebugMode,
	WindowDebugOptions,
} from './types';

type WindowWithC15tDebug = Window & {
	c15t?: C15tWindowDebug;
};

const inertHandle: WindowDebugHandle = {
	dispose() {},
};

export function createWindowDebug(
	options: WindowDebugOptions
): WindowDebugHandle {
	if (typeof window === 'undefined') {
		return inertHandle;
	}

	const target = window as WindowWithC15tDebug;
	const installed: C15tWindowDebug = Object.freeze({
		version,
		pkg: options.pkg,
		mode: options.mode,
	});

	target.c15t = installed;

	return {
		dispose() {
			if (target.c15t === installed) {
				delete target.c15t;
			}
		},
	};
}
