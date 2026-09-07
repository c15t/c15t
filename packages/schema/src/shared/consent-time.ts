/**
 * Bounds on client-supplied consent timestamps.
 *
 * Shared rather than duplicated because it changes what is **stored** on a
 * consent record: two backends applying different bounds to the same
 * submission would put different `givenAt` values in the audit trail.
 */

/** How far ahead of server time a client-supplied consent time may be. */
export const MAX_FUTURE_CONSENT_TIME_DRIFT_MS = 5 * 60 * 1000;

/**
 * Clamps a client-supplied consent time to server time when it is more than
 * five minutes in the future.
 *
 * Small clock skews and past timestamps are preserved so offline submissions
 * retain the time at which the user made their choice.
 *
 * @param givenAt - Client-supplied consent timestamp
 * @param now - Server time in epoch milliseconds
 * @returns `givenAt` when within tolerance, otherwise a `Date` at `now`
 */
export const clampConsentGivenAt = function clampConsentGivenAt(
	givenAt: Date,
	now = Date.now()
): Date {
	if (givenAt.getTime() > now + MAX_FUTURE_CONSENT_TIME_DRIFT_MS) {
		return new Date(now);
	}

	return givenAt;
};
