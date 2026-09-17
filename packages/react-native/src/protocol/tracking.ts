/**
 * Platform tracking authorization, as the native cores report it.
 *
 * This is a platform gate and not a consent state. `native/CONTRACT.md` says it
 * in one line: no platform authorization moves a category from `denied` or
 * `pending` to `granted`. The value here exists so a host can combine the two
 * answers, never so one can be mistaken for the other.
 *
 * The arms are the four states Apple reports, plus `unsupported` for a build the
 * platform asks nothing of. That arm carries the weight: it has to stay
 * distinguishable from `not-determined`, because "this platform has no tracking
 * gate" and "the subject has not been asked yet" are opposite instructions to a
 * caller.
 */

/**
 * Every arm a native core may report, in the order Apple's enum lists them.
 *
 * The spellings are the wire values, so Swift, Kotlin, and JavaScript name one
 * set. `unsupported` is what Android always answers: the advertising identifier
 * sits behind Google Play services' own consent surface, which this package
 * deliberately does not depend on, so there is no platform answer to read. iOS
 * answers it when the build carries no `NSUserTrackingUsageDescription`, because
 * then there is no prompt this binary can show.
 */
export const TRACKING_AUTHORIZATION_STATUSES = [
	'authorized',
	'denied',
	'not-determined',
	'restricted',
	'unsupported',
] as const;

/**
 * One arm of {@link TRACKING_AUTHORIZATION_STATUSES}.
 *
 * `restricted` is Apple's "a parent or a device policy decides", which no app can
 * change and no consent UI can unlock.
 */
export type TrackingAuthorization =
	(typeof TRACKING_AUTHORIZATION_STATUSES)[number];

/**
 * The payload both `getTrackingAuthorization()` and
 * `requestTrackingAuthorization()` resolve with.
 *
 * One field, encoded as JSON, exactly as every other structured payload on this
 * boundary: Codegen cannot pass a union, and one encoding keeps the Swift,
 * Kotlin, and JavaScript reads identical.
 */
export interface TrackingAuthorizationPayload {
	/** The platform answer, after the build-time check. */
	readonly status: TrackingAuthorization;
}

/**
 * Read the arm out of a native tracking payload.
 *
 * Anything this build cannot name becomes `denied`, deliberately and in both
 * directions. An unreadable payload is not evidence that the platform asks
 * nothing, so it must not land on `unsupported`, which is the one arm that lets
 * tracking through without a platform yes. A renamed field therefore shows up as
 * tracking that stays off, which is a bug a host can see, rather than as
 * authorization nothing granted.
 *
 * @param raw - JSON text from the bridge.
 * @returns The arm the payload names, or `denied` when it names none of them.
 */
export const parseTrackingAuthorization = function parseTrackingAuthorization(
	raw: string
): TrackingAuthorization {
	let parsed: unknown = null;

	try {
		parsed = JSON.parse(raw);
	} catch {
		return 'denied';
	}

	if (typeof parsed !== 'object' || parsed === null) {
		return 'denied';
	}

	const { status } = parsed as Record<string, unknown>;

	return (TRACKING_AUTHORIZATION_STATUSES as readonly unknown[]).includes(
		status
	)
		? (status as TrackingAuthorization)
		: 'denied';
};
