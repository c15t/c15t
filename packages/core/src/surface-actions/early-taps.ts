/**
 * Banner taps made before the page's JavaScript runs.
 *
 * A server-rendered banner paints long before its framework hydrates. On a
 * slow phone that gap lasts seconds, and a tap in it lands on a plain
 * `<button>` with no handler: the banner stays and nothing is saved.
 *
 * The banner renders `EARLY_CONSENT_TAP_SCRIPT` ahead of its markup. The
 * script listens for clicks on the stock banner's actions, records each one
 * with the time it happened, and hides the banner on accept, reject or
 * dismiss so the tap shows an effect. It stops the event there, so a
 * framework that hydrates later never sees the same click a second time.
 *
 * When the hydrated banner mounts, it calls {@link replayEarlyConsentTaps}.
 * That stops the script, waits for the runtime and the policy, and records
 * the visitor's choice at the time they tapped. A tap on a
 * banner for another model or prompt than the one that resolves is
 * dropped, and the banner shows again.
 */

import type { AllConsentNames } from '../consent/consent-types';
import type { ConsentKernel, ConsentSnapshot, SaveUISource } from '../types';
import {
	EARLY_TAP_ROOT,
	EARLY_TAP_STYLE_ID,
	EARLY_TAPS_WINDOW_KEY,
} from './early-tap-script';
import type { EarlyConsentTap, EarlyConsentTapQueue } from './early-tap-script';
import { showConsentSurface } from './rules';
import { saveConsentSurface } from './save';

/** How long a closed banner may take to leave the DOM before it shows. */
const LEAVE_TIMEOUT_MS = 3000;

/**
 * The tap to replay: the last accept, reject or dismiss, which is what the
 * visitor last decided, else the last customize.
 */
const pickTap = (
	taps: readonly EarlyConsentTap[]
): EarlyConsentTap | undefined =>
	taps.findLast((tap) => tap.action !== 'customize') ?? taps.at(-1);

/**
 * Whether the resolved policy is still the kind the visitor saw. The
 * banner's markup names its model and prompt; a tap on an opt-in choice
 * banner says nothing about an opt-out notice that replaced it. Adapters
 * write the rule's model or the effective one, so either matches.
 */
const stillApplies = (
	tap: EarlyConsentTap,
	snapshot: ConsentSnapshot
): boolean =>
	snapshot.resolution.status === 'matched' &&
	!snapshot.externalPermissions &&
	snapshot.model !== 'iab' &&
	(tap.model === null ||
		tap.model === snapshot.policyRule.model ||
		tap.model === snapshot.model) &&
	(tap.prompt === null || tap.prompt === snapshot.policyRule.prompt);

/** Show the banner again: drop the style the tap added. */
const unhide = (view: Window): void => {
	view.document.getElementById(EARLY_TAP_STYLE_ID)?.remove();
};

/**
 * Keep the banner hidden until the framework removed the markup the visitor
 * tapped, so an exit animation does not flash it back. A banner the policy
 * still owes, or one that never leaves, shows again.
 */
const unhideWhenGone = (kernel: ConsentKernel, view: Window): void => {
	const roots = [...view.document.querySelectorAll(EARLY_TAP_ROOT)];
	const deadline = Date.now() + LEAVE_TIMEOUT_MS;
	const check = () => {
		if (
			kernel.getSnapshot().activeUI === 'banner' ||
			roots.every((root) => !root.isConnected) ||
			Date.now() > deadline
		) {
			unhide(view);
			return;
		}
		view.requestAnimationFrame(check);
	};
	view.requestAnimationFrame(check);
};

const apply = (
	kernel: ConsentKernel,
	tap: EarlyConsentTap,
	view: Window,
	options: EarlyConsentTapReplayOptions
): void => {
	if (!stillApplies(tap, kernel.getSnapshot())) {
		unhide(view);
		return;
	}
	if (tap.action === 'customize') {
		showConsentSurface(kernel, 'dialog');
		unhide(view);
		return;
	}
	if (tap.action === 'dismiss') {
		void kernel.commands.dismissNotice({ actionAt: tap.at });
	} else {
		void saveConsentSurface(kernel, () =>
			kernel.commands.save(tap.action === 'accept' ? 'all' : 'none', {
				actionAt: tap.at,
				categories: options.categories?.(),
				uiSource: options.uiSource ?? 'banner',
			})
		);
	}
	unhideWhenGone(kernel, view);
};

/** What {@link replayEarlyConsentTaps} needs from the adapter. @internal */
export interface EarlyConsentTapReplayOptions {
	/**
	 * Whether the runtime has started: stored records are hydrated and any
	 * prefetch adopted. The choice waits for it, so it is the newest record
	 * and persistence writes it.
	 */
	started: () => boolean;
	/**
	 * The categories the stock banner displays, read when the choice is
	 * recorded. Omit for the whole choice scope.
	 */
	categories?: () => readonly AllConsentNames[] | undefined;
	/**
	 * The window the banner was rendered into, where the script ran.
	 * Defaults to `window`; a tree rendered into another frame passes its
	 * own.
	 */
	view?: Window | null;
	/**
	 * The UI recorded with the choice, as the banner's own buttons record
	 * it. Defaults to `banner`.
	 */
	uiSource?: SaveUISource;
}

/**
 * Take over from `EARLY_CONSENT_TAP_SCRIPT`: stop capturing clicks and
 * record the tap the visitor made before the page hydrated.
 *
 * The stock banner calls it when it mounts in the browser, which is when
 * its own handlers take over. Changing the banner from then on no longer
 * races hydration.
 *
 * The choice is recorded once the runtime has started and the policy has
 * resolved, at the time of the tap, through the same surface actions a
 * hydrated banner uses. A policy that failed to resolve, or resolved to
 * another model or prompt than the banner showed, drops the tap and shows
 * the banner again. Without a script on the page, or after the taps were
 * recorded, it does nothing.
 *
 * @param kernel - The runtime's kernel.
 * @param options - Whether the runtime started, and the displayed
 * categories.
 * @returns Cleanup for an unmounting banner. A tap still waiting goes back
 * to the queue, so the next banner that mounts records it.
 * @internal
 */
export const replayEarlyConsentTaps = (
	kernel: ConsentKernel,
	options: EarlyConsentTapReplayOptions
): (() => void) => {
	const view = options.view ?? window;
	const host = view as unknown as Record<string, EarlyConsentTapQueue>;
	const queue = host[EARLY_TAPS_WINDOW_KEY];
	// Claimed: the script stops, and a script that somehow runs again sees
	// the key and installs nothing.
	host[EARLY_TAPS_WINDOW_KEY] = {};
	queue?.stop?.();
	const taps = queue?.taps ?? [];
	const tap = pickTap(taps);
	if (!tap) {
		unhide(view);
		return () => undefined;
	}
	const stops: (() => void)[] = [];
	const settle = () => {
		if (stops.length === 0 || !options.started()) {
			return;
		}
		const { policyPending, resolution } = kernel.getSnapshot();
		if (policyPending) {
			// A failed init shows no banner either way. Keep the tap for a
			// retry that resolves the policy.
			if (resolution.status === 'failed') {
				unhide(view);
			}
			return;
		}
		for (const stop of stops.splice(0)) {
			stop();
		}
		apply(kernel, tap, view, options);
	};
	// Either one tells us the runtime started: adopting a prefetch emits
	// `init:applied`, and a resolved `/init` commits a snapshot. Outside the
	// commit or event that announced it.
	const recheck = () => queueMicrotask(settle);
	stops.push(
		kernel.subscribe(recheck),
		kernel.events.on('init:applied', recheck)
	);
	settle();
	return () => {
		if (stops.length > 0) {
			for (const stop of stops.splice(0)) {
				stop();
			}
			host[EARLY_TAPS_WINDOW_KEY] = { taps };
		}
	};
};
