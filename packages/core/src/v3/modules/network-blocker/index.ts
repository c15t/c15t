/**
 * c15t/v3/modules/network-blocker
 *
 * Kernel-consuming network blocker. Patches `window.fetch` and
 * `XMLHttpRequest.prototype.{open, send}` to intercept requests and
 * block ones whose consent condition isn't satisfied.
 *
 * Concerns are split across siblings:
 * - `types.ts`         — public + internal type definitions.
 * - `url.ts`           — pure URL / method matching helpers.
 * - `decide.ts`        — pure per-request block evaluation.
 * - `patch-fetch.ts`   — `window.fetch` install + uninstall.
 * - `patch-xhr.ts`     — XHR prototype install + uninstall.
 * - `index.ts`         — this file: wiring + lifecycle.
 *
 * v2 parity: `packages/core/src/libs/network-blocker/{core,store,types}.ts`.
 *
 * Invariants:
 * - Idempotent init: safe to call twice; the second instance shares the
 *   teardown lock with the first.
 * - `dispose` restores the original `fetch` and XHR prototypes — if no
 *   other consumer has installed on top. Subsequent installs chain via
 *   the existing patched function, so disposing in reverse install order
 *   is the safe path (matching v2's behavior).
 * - Blocked fetch → 451 `Response`. Blocked XHR → `abort()` + synthetic
 *   `ProgressEvent('error')`.
 * - Does NOT patch `sendBeacon`, `WebSocket`, `EventSource` (v2 parity;
 *   future opt-in).
 * - The blocker holds onto the last snapshot it saw so each fetch / XHR
 *   evaluates against the freshest consent state without round-tripping
 *   to the kernel. The snapshot reference is swapped on every kernel
 *   subscribe tick.
 */
import type { ConsentSnapshot } from '../../types';
import { installFetchPatch } from './patch-fetch';
import { installXhrPatch } from './patch-xhr';
import type {
	BlockedRequestInfo,
	NetworkBlockerHandle,
	NetworkBlockerOptions,
	NetworkBlockerRule,
} from './types';

export type {
	BlockDecision,
	BlockedRequestInfo,
	NetworkBlockerConfig,
	NetworkBlockerHandle,
	NetworkBlockerOptions,
	NetworkBlockerRule,
} from './types';

export function createNetworkBlocker(
	options: NetworkBlockerOptions
): NetworkBlockerHandle {
	const { kernel, onRequestBlocked } = options;
	const logBlocked = options.logBlockedRequests ?? true;
	let rules: NetworkBlockerRule[] = [...(options.rules ?? [])];
	let enabled = options.enabled !== false;
	let snapshot: ConsentSnapshot = kernel.getSnapshot();

	const unsubscribe = kernel.subscribe((next) => {
		snapshot = next;
	});

	// In non-browser (Node/RSC) environments there is nothing to patch;
	// the handle is a no-op that only subscribes for parity.
	const hasBrowserAPIs =
		typeof window !== 'undefined' &&
		typeof XMLHttpRequest !== 'undefined' &&
		typeof window.fetch === 'function';

	if (!hasBrowserAPIs) {
		return {
			dispose() {
				unsubscribe();
			},
			updateRules(next) {
				rules = [...next];
			},
			setEnabled(v) {
				enabled = v;
			},
		};
	}

	function notifyBlocked(info: BlockedRequestInfo): void {
		if (logBlocked) {
			// biome-ignore lint/suspicious/noConsole: user-configurable warning
			console.warn(
				`[c15t] blocked ${info.method} ${info.url}${
					info.rule?.id ? ` (rule: ${info.rule.id})` : ''
				}`
			);
		}
		if (onRequestBlocked) {
			try {
				onRequestBlocked(info);
			} catch {
				// Swallow — v2 parity.
			}
		}
	}

	const patchDeps = {
		getRules: () => rules,
		getSnapshot: () => snapshot,
		isEnabled: () => enabled,
		notifyBlocked,
	};

	const uninstallFetch = installFetchPatch(patchDeps);
	const uninstallXhr = installXhrPatch(patchDeps);

	return {
		dispose() {
			unsubscribe();
			uninstallFetch();
			uninstallXhr();
		},
		updateRules(next) {
			rules = [...next];
		},
		setEnabled(v) {
			enabled = v;
		},
	};
}
