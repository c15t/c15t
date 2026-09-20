/**
 * Forward subject decisions to the native core.
 */

import { useMemo } from 'react';

import type {
	CommitResult,
	NativeOverridesInput,
	TrackingAuthorization,
} from '../protocol';
import type { OptionalConsentCategory } from '../protocol/vocabulary';
import { useConsentClient } from '../provider/consent-context';

/**
 * The actions a consent surface can take.
 *
 * The object is stable for the life of the provider, so it is safe in a
 * dependency list or a memoized component.
 */
export interface ConsentActions {
	/**
	 * Record an explicit per-category choice, the shape a preference centre
	 * saves.
	 *
	 * Only the categories you pass are written. Omitted categories keep their
	 * stored receipts, which is what stops a preference-centre save from
	 * renewing a consent the subject never looked at.
	 *
	 * @param consents - Per-category decision.
	 * @returns What the native core recorded, including `queued` when it was
	 *   persisted for replay rather than delivered.
	 */
	save: (
		consents?: Readonly<Partial<Record<OptionalConsentCategory, boolean>>>
	) => Promise<CommitResult>;
	/**
	 * Grant every category in the policy scope.
	 *
	 * @returns What the native core recorded.
	 */
	acceptAll: () => Promise<CommitResult>;
	/**
	 * Grant necessary only.
	 *
	 * @returns What the native core recorded.
	 */
	rejectAll: () => Promise<CommitResult>;
	/**
	 * Record that the current notice was dismissed.
	 *
	 * Local and synchronous: a notice is an acknowledgement, not a written
	 * consent record, so nothing is sent to the backend.
	 */
	dismissNotice: () => void;
	/**
	 * Re-resolve policy, re-evaluate, and retry the offline queue.
	 */
	refresh: () => Promise<void>;
	/**
	 * Attach an external id and load that subject's stored record.
	 *
	 * @param externalId - Id from the app's own account system.
	 */
	identify: (externalId: string) => Promise<void>;
	/**
	 * Detach the external id. Consent stays with the c15t subject id, so
	 * signing out does not reset consent.
	 */
	logout: () => Promise<void>;
	/**
	 * Wipe consent and return the device to the state a first launch boots
	 * with.
	 *
	 * The subject owes the choice prompt again afterwards, so the banner or
	 * dialog comes back: this is a withdrawal that has to be answered again, not
	 * a recorded reject-everything. It is the surface for a "start over" affordance
	 * and for a reviewer who needs the fresh-install state without reinstalling.
	 *
	 * The c15t subject id is kept, because the backend holds an audit history
	 * keyed to it; erasing what the backend holds for that subject is a backend
	 * call, not something this wipe can do on the device. Overrides and the
	 * configured category scope are kept as well, since they are configuration
	 * rather than consent.
	 *
	 * Resolves once the local state is durable. It does not wait on a consent save
	 * that was already travelling when the wipe landed: the native core cannot
	 * recall a request it has handed to the transport, and anything still queued
	 * goes with the queue. Policy re-resolves in the background the way a first
	 * launch does, so a banner that comes back may arrive a moment later than the
	 * promise.
	 */
	reset: () => Promise<void>;
	/**
	 * Ask the platform for tracking authorization.
	 *
	 * Nothing in this package calls it, and nothing in this package can: the
	 * platform prompt belongs after your own consent UI, so that the system dialog
	 * is never the first thing a subject reads about tracking. Call it once the
	 * subject has answered, and read the answer with
	 * {@link useIsTrackingAllowed} rather than from this promise alone.
	 *
	 * Whether this can produce a prompt is Apple's call. Outside the European Union the
	 * dialog appears once and later calls resolve with the answer on the device. Inside
	 * it, an answered request may come back a year later, whichever way it went, and the
	 * only way to find out whether this install is eligible is to ask. It rejects with
	 * `C15T_TRACKING_NOT_CONFIGURED` on an iOS build whose `Info.plist` carries no
	 * `NSUserTrackingUsageDescription`, where the system dialog is suppressed and the
	 * answer comes back denied without a word, and with `C15T_TRACKING_UNSUPPORTED` on
	 * Android, where there is no platform question to ask.
	 *
	 * @returns The platform arm after the request settled.
	 */
	requestTrackingAuthorization: () => Promise<TrackingAuthorization>;
	/**
	 * Pin country, region, language, or publisher test mode.
	 *
	 * Useful for a debug menu and for review-gated builds that must evaluate a
	 * specific region's policy. Overrides change which rule matches; they never
	 * create a consent record.
	 *
	 * @param overrides - Fields to change; omitted fields keep their value, and
	 *   an explicit `null` clears one.
	 */
	setOverrides: (overrides: NativeOverridesInput) => Promise<void>;
}

/**
 * Get the actions for the mounted native core.
 *
 * @returns A stable action object.
 */
export const useConsentActions = function useConsentActions(): ConsentActions {
	const client = useConsentClient();

	return useMemo(
		() => ({
			acceptAll: () => client.commit({ action: 'all' }),
			dismissNotice: () => {
				client.dismissNotice();
			},
			identify: (externalId: string) => client.identify(externalId),
			logout: () => client.logout(),
			refresh: () => client.refresh(),
			rejectAll: () => client.commit({ action: 'necessary' }),
			requestTrackingAuthorization: () => client.requestTrackingAuthorization(),
			reset: () => client.reset(),
			save: (
				consents?: Readonly<Partial<Record<OptionalConsentCategory, boolean>>>
			) => client.commit({ action: 'explicit', consents: consents ?? {} }),
			setOverrides: (overrides: NativeOverridesInput) =>
				client.setOverrides(overrides),
		}),
		[client]
	);
};
