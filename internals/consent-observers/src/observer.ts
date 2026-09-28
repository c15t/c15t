/**
 * A framework-free consent observer, written the way a third-party
 * integration (an analytics SDK, a tag manager bridge) would write one.
 *
 * It only touches the documented kernel surface: `getSnapshot()` to read the
 * current state when it attaches, `subscribe()` for changes, and `refresh()`
 * at gate time. It never looks for a kernel on `window` and never imports
 * anything outside the packages' `exports` maps.
 */
import type { AllConsentNames, ConsentKernel, ConsentSnapshot } from 'c15t';

/** What the observer keeps from one snapshot. */
export interface ObservedConsent {
	/** Kernel revision the permissions belong to. */
	readonly revision: number;
	/** Effective permissions at that revision. */
	readonly permissions: ConsentSnapshot['effectivePermissions'];
}

/** A live subscription to one kernel. */
export interface ConsentObserver {
	/** State read on attach, then replaced by every notification. */
	readonly current: ObservedConsent;
	/** Notifications received since attaching, oldest first. */
	readonly notifications: readonly ObservedConsent[];
	/**
	 * Re-evaluates the kernel at gate time and answers whether `category`
	 * may run now. An elapsed grant is denied even if the deadline timer has
	 * not fired yet.
	 *
	 * @param category - Category the gated feature needs.
	 * @param now - Evaluation time; defaults to the kernel clock.
	 * @returns Whether the category is permitted after the refresh.
	 */
	allows: (category: AllConsentNames, now?: number) => boolean;
	/** Stops observing. Safe to call more than once. */
	detach: () => void;
}

const observe = function observe(snapshot: ConsentSnapshot): ObservedConsent {
	return {
		permissions: snapshot.effectivePermissions,
		revision: snapshot.revision,
	};
};

/**
 * Attaches an observer to a kernel.
 *
 * The kernel does not replay the current state to a new subscriber, so the
 * observer reads it once on attach.
 *
 * @param kernel - Kernel from `createConsentRuntime().kernel` or `KernelContext`.
 * @returns The observer handle.
 */
export const observeConsent = function observeConsent(
	kernel: ConsentKernel
): ConsentObserver {
	let current = observe(kernel.getSnapshot());
	const notifications: ObservedConsent[] = [];
	const unsubscribe = kernel.subscribe((snapshot) => {
		current = observe(snapshot);
		notifications.push(current);
	});
	let attached = true;

	return {
		allows(category, now) {
			return kernel.refresh(now).effectivePermissions[category];
		},
		get current() {
			return current;
		},
		detach() {
			if (!attached) {
				return;
			}
			attached = false;
			unsubscribe();
		},
		notifications,
	};
};
