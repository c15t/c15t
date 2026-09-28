'use client';

import type { NetworkBlockerRule } from '@c15t/core/modules/network-blocker';
import { holdNetworkRequests, NOT_HELD } from '@c15t/core/modules/network-hold';
import type { NetworkHold } from '@c15t/core/modules/network-hold';
import { useState } from 'react';

/**
 * How long a hold started during render waits for its component to commit.
 * A render React throws away never commits, so nothing else would end its
 * hold. When this runs out the hold ends, and since nothing checked consent
 * for the requests it held, they get the blocker's answer for a blocked
 * request instead of being sent.
 * @internal
 */
export const UNCOMMITTED_HOLD_MS = 10_000;

/**
 * The render-time hold behind one network blocker mount.
 * @internal
 */
export interface EarlyNetworkHold {
	/**
	 * Call from the mount effect, before loading the blocker. Keeps the hold
	 * from expiring, starts a new one if it already ended (a StrictMode or
	 * kernel re-run after the blocker took over, or a commit that came after
	 * the expiry), and returns it for `createNetworkBlocker({ hold })`. A
	 * disabled blocker gets a hold that holds nothing, so it cannot end
	 * another caller's hold.
	 */
	claim: (
		rules: readonly NetworkBlockerRule[],
		enabled: boolean | undefined
	) => NetworkHold;
	/**
	 * Call from the mount effect's cleanup. Ends a hold no blocker took
	 * over, unless the effect runs again first (StrictMode, a kernel change).
	 * Nothing checked consent for what that hold held, so those requests get
	 * the blocker's answer for a blocked request instead of being sent.
	 */
	unmount: () => void;
}

interface Slot extends EarlyNetworkHold {
	expire: () => void;
	key: string;
}

/** Render-time holds whose component has not committed yet. */
const uncommitted = new Set<Slot>();

const createSlot = function createSlot(
	rules: readonly NetworkBlockerRule[],
	enabled: boolean | undefined
): Slot {
	let hold: NetworkHold | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let mounts = 0;
	const slot: Slot = {
		claim(latestRules, latestEnabled) {
			uncommitted.delete(slot);
			clearTimeout(timer);
			mounts += 1;
			if (latestEnabled !== false && !hold?.held) {
				hold = holdNetworkRequests(latestRules);
			}
			// A render React discarded (StrictMode's second render, a retry
			// after suspending) started a hold for the same rules that nothing
			// will claim. This hold covers its requests, so end it now instead
			// of letting it delay requests the blocker allows. Only after this
			// hold is in place: ending it fails what no live hold still covers.
			for (const other of uncommitted) {
				if (other.key === slot.key) {
					other.expire();
				}
			}
			// Never `undefined`: without a hold, the blocker would end every
			// caller's hold and send their requests past a disabled gate.
			return hold ?? NOT_HELD;
		},
		expire() {
			uncommitted.delete(slot);
			clearTimeout(timer);
			hold?.block();
		},
		key: '',
		unmount() {
			const mount = mounts;
			const current = hold;
			queueMicrotask(() => {
				if (mounts === mount) {
					current?.block();
				}
			});
		},
	};
	if (typeof window !== 'undefined' && enabled !== false) {
		hold = holdNetworkRequests(rules);
		slot.key = JSON.stringify(rules);
		uncommitted.add(slot);
		timer = setTimeout(() => slot.expire(), UNCOMMITTED_HOLD_MS);
	}
	return slot;
};

/**
 * Hold requests matching `rules` from this component's first render in the
 * browser, before any child renders or runs an effect. The network blocker
 * loads after mount and takes the hold over.
 *
 * Rendering is not side-effect free: the first render patches `fetch` and
 * `XMLHttpRequest`. That is safe because the hold only delays matching
 * requests, a render React discards ends its hold after
 * {@link UNCOMMITTED_HOLD_MS} (failing what it held as blocked), and on the
 * server it does nothing.
 *
 * @internal
 */
export const useEarlyNetworkHold = function useEarlyNetworkHold(
	rules: readonly NetworkBlockerRule[],
	enabled: boolean | undefined
): EarlyNetworkHold {
	// oxlint-disable-next-line react/hook-use-state -- Created once, during the first render.
	const [slot] = useState(() => createSlot(rules, enabled));
	return slot;
};
