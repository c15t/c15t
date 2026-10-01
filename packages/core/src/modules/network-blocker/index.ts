/**
 * `@c15t/core/modules/network-blocker`
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
 * - While consent is unknown (the policy is still pending and has not
 *   failed), a request that would be blocked waits instead, then is
 *   evaluated again. A failed policy load settles it as blocked.
 * - Takes over from `holdNetworkRequests()`: requests held before the
 *   blocker loaded are replayed through its patches.
 * - The blocker holds onto the last snapshot it saw so each fetch / XHR
 *   evaluates against the freshest consent state without round-tripping
 *   to the kernel. The snapshot reference is swapped on every kernel
 *   subscribe tick.
 */
import { extractConsentNamesFromCondition } from '../../libs/has';
import { declareOwnedVendors, forgetOwnedVendors } from '../../libs/vendors';
import type { ConsentSnapshot } from '../../types';
import { releaseNetworkRequests } from './hold';
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

export const createNetworkBlocker = function createNetworkBlocker(
	options: NetworkBlockerOptions
): NetworkBlockerHandle {
	const { kernel, onRequestBlocked } = options;
	const logBlocked = options.logBlockedRequests ?? true;
	let rules: NetworkBlockerRule[] = [...(options.rules ?? [])];
	const ownerSource = Symbol('network-blocker');
	const registerCategories = () => {
		kernel.set.registerConsentCategories(
			rules.flatMap((rule) => extractConsentNamesFromCondition(rule.category))
		);
		declareOwnedVendors(kernel, rules, ownerSource);
	};
	registerCategories();
	let enabled = options.enabled !== false;
	let disposed = false;
	let snapshot: ConsentSnapshot = kernel.getSnapshot();

	// Consent is unknown until the policy resolves: stored records may not be
	// hydrated yet and the fallback policy denies everything optional.
	// Requests that would be blocked wait for this instead of failing.
	let settled: Promise<void> | null = null;
	let settle: (() => void) | null = null;
	const consentPending = (): boolean =>
		!disposed &&
		enabled &&
		snapshot.policyPending &&
		snapshot.resolution.status !== 'failed';
	const whenSettled = (): Promise<void> | null => {
		if (!consentPending()) {
			return null;
		}
		settled ??= new Promise((resolve) => {
			settle = resolve;
		});
		return settled;
	};
	const releaseWaiting = (): void => {
		if (settle && !consentPending()) {
			settle();
			settle = null;
			settled = null;
		}
	};

	// Another source can sweep these rules' slugs out of the declared set: a
	// provider replacing its own rule entries, or a backend init dropping a
	// vendor a rule here still names. Mounted rules own their slugs for as
	// long as they are configured, so put them back as soon as the set
	// changes; a stored denial for one of them would otherwise be ignored.
	// Idempotent: nothing missing means no commit.
	let lastVendors: unknown = snapshot.vendors;
	const declareMissingVendors = (next: ConsentSnapshot): void => {
		const declared = new Set(next.vendors?.declared.map((vendor) => vendor.id));
		if (rules.some((rule) => rule.vendor && !declared.has(rule.vendor))) {
			declareOwnedVendors(kernel, rules, ownerSource);
		}
	};

	const unsubscribe = kernel.subscribe((next) => {
		snapshot = next;
		releaseWaiting();
		if (next.vendors !== lastVendors) {
			lastVendors = next.vendors;
			declareMissingVendors(next);
		}
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
				forgetOwnedVendors(kernel, ownerSource);
			},
			setEnabled(v) {
				enabled = v;
			},
			updateRules(next) {
				rules = [...next];
				registerCategories();
			},
		};
	}

	const notifyBlocked = function notifyBlocked(info: BlockedRequestInfo): void {
		if (logBlocked) {
			// oxlint-disable-next-line no-console -- user-configurable warning
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
	};

	const patchDeps = {
		getRules: () => rules,
		getSnapshot: () => snapshot,
		isEnabled: () => enabled,
		notifyBlocked,
		whenSettled,
	};

	const replayHeld = options.hold
		? options.hold.release()
		: releaseNetworkRequests();
	const uninstallFetch = installFetchPatch(patchDeps);
	const uninstallXhr = installXhrPatch(patchDeps);
	replayHeld();

	return {
		dispose() {
			disposed = true;
			releaseWaiting();
			unsubscribe();
			uninstallFetch();
			uninstallXhr();
			forgetOwnedVendors(kernel, ownerSource);
		},
		setEnabled(v) {
			enabled = v;
			releaseWaiting();
		},
		updateRules(next) {
			rules = [...next];
			registerCategories();
		},
	};
};
