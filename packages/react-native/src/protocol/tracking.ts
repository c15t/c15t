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
 * The payload `getTrackingAuthorization()` resolves with.
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
 * Whether a tracking request settled or only paused.
 *
 * `additional-information` is Apple's European Union sheet closing because the subject
 * tapped Additional Information. Apple records no answer for that tap and still reports
 * `not-determined`, so the arm alone cannot tell a caller whether the subject is partway
 * through deciding or has simply never been asked. The stage is what makes that legible.
 *
 * A binary that predates the expanded request never sends this field, and readers treat a
 * missing stage as `final`, which is what the older payload meant.
 */
export const TRACKING_REQUEST_STAGES = [
	'final',
	'additional-information',
] as const;

/** One arm of {@link TRACKING_REQUEST_STAGES}. */
export type TrackingRequestStage = (typeof TRACKING_REQUEST_STAGES)[number];

/**
 * Which of Apple's two tracking calls this SDK made.
 *
 * This names the call, not the sheet. Apple keeps its expanded presentation to devices in a
 * specific European Union country signed in with an Apple Account from a specific EU country
 * or region, and outside those rules it shows the plain alert even when this SDK asked for
 * the expanded call. So `expanded` means "the expanded request was made on a runtime that
 * had it", and it is not evidence that the subject was in the EU or that any regional rule
 * applied to them.
 *
 * Absent when no call was made at all, which is what a restricted device looks like.
 */
export const TRACKING_PRESENTATIONS = ['expanded', 'standard'] as const;

/** One arm of {@link TRACKING_PRESENTATIONS}. */
export type TrackingPresentation = (typeof TRACKING_PRESENTATIONS)[number];

/**
 * The payload `requestTrackingAuthorization()` resolves with.
 *
 * `status` carries the same meaning, and the same arm names, as
 * {@link TrackingAuthorizationPayload}. The other two fields say how to read it and are
 * absent on a binary that predates them.
 */
export interface TrackingRequestPayload {
	/** The platform answer, preserved exactly as Apple reported it. */
	readonly status: TrackingAuthorization;
	/** Whether the answer settles the request. */
	readonly stage: TrackingRequestStage;
	/** The call that ran, or `undefined` when nothing was asked. */
	readonly presentation?: TrackingPresentation;
}

/**
 * Read a tracking request payload.
 *
 * Loose on purpose, in one direction only. `status` is held to the same rule as
 * {@link parseTrackingAuthorization}: an arm this build cannot name becomes `denied`,
 * because an unreadable payload is not evidence that the platform asks nothing. `stage` and
 * `presentation` are the reverse. Both are additions to a payload that older binaries
 * already send without them, so an absent or unrecognised one falls back to the answer that
 * payload would have meant before this feature existed: a settled request whose call is
 * unknown. Making a missing stage fail closed into a pause would open a preference centre
 * that nothing asked for.
 *
 * @param raw - JSON text from the bridge.
 * @returns The request outcome the payload describes.
 */
export const parseTrackingRequest = function parseTrackingRequest(
	raw: string
): TrackingRequestPayload {
	let parsed: unknown = null;

	try {
		parsed = JSON.parse(raw);
	} catch {
		return { stage: 'final', status: 'denied' };
	}

	if (typeof parsed !== 'object' || parsed === null) {
		return { stage: 'final', status: 'denied' };
	}

	const { presentation, stage, status } = parsed as Record<string, unknown>;

	return {
		presentation: (TRACKING_PRESENTATIONS as readonly unknown[]).includes(
			presentation
		)
			? (presentation as TrackingPresentation)
			: undefined,
		stage: (TRACKING_REQUEST_STAGES as readonly unknown[]).includes(stage)
			? (stage as TrackingRequestStage)
			: 'final',
		status: (TRACKING_AUTHORIZATION_STATUSES as readonly unknown[]).includes(
			status
		)
			? (status as TrackingAuthorization)
			: 'denied',
	};
};

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
