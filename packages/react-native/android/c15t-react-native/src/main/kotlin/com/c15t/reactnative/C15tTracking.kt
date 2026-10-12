package com.c15t.reactnative

/**
 * The arms a native core may report about platform tracking, spelled the way the wire
 * spells them.
 *
 * Raw values are the values `TrackingAuthorization` in `src/protocol/tracking.ts`
 * declares, so Swift, Kotlin, and JavaScript name one set and a host that reads the
 * bridge sees the same strings whichever core answered.
 *
 * Only [UNSUPPORTED] is reachable from Android, and that is the honest answer rather
 * than a gap in this build; see [C15tTracking]. The other arms are here because the
 * vocabulary is shared, and because a caller has to be able to tell "this platform has
 * no such question" ([UNSUPPORTED]) from "the subject has not been asked yet"
 * ([NOT_DETERMINED]). Collapsing those two is the mistake that either switches Android
 * analytics off for everyone or reads a missing prompt string as permission.
 */
enum class C15tTrackingAuthorization(
	/** The wire value JavaScript compares against. */
	val wireValue: String,
) {
	AUTHORIZED("authorized"),
	DENIED("denied"),
	NOT_DETERMINED("not-determined"),
	RESTRICTED("restricted"),
	UNSUPPORTED("unsupported"),
}

/**
 * What Android reports about tracking authorization, and why it is always the same arm.
 *
 * iOS has a platform gate this package can read and, with a prompt string in
 * `Info.plist`, can ask for. Android has neither, and the difference is not a missing
 * feature:
 *
 * - The advertising identifier (AAID) is not an Android framework value. It lives in
 *   Google Play services, and reading it means the Play services advertising API, called
 *   off the main thread because it round-trips a service binder. This package depends on
 *   the consent engine and React Native only, and pulling Play services into a consent
 *   SDK would decide a dependency question every host should decide for itself.
 * - Since API 33 the manifest carries `com.google.android.gms.permission.AD_ID`, and its
 *   grant state is readable. That is not the answer a tracking gate wants: the prompt
 *   that sets it belongs to Play services, not to this app, it cannot be asked again once
 *   answered, and its denial does not describe anything the c15t decision covers.
 *   Reporting it as `denied` would switch measurement off on every Android device that
 *   has not seen a Google dialog, which is a consent claim no one made.
 *
 * So Android reports [C15tTrackingAuthorization.UNSUPPORTED]: the platform adds no gate
 * in front of this decision, and the c15t decision alone decides. That is the reading
 * `isTrackingPermitted` on the JavaScript side gives the arm, and it is why the arm is
 * not `NOT_DETERMINED`, which means a subject is still owed a question.
 *
 * A request therefore rejects instead of resolving. There is nothing to ask, and
 * resolving would tell the host a prompt happened that no user ever saw.
 */
object C15tTracking {
	/** The one arm this platform reports. */
	val status: C15tTrackingAuthorization
		get() = C15tTrackingAuthorization.UNSUPPORTED

	/** Rejection code for a tracking request on a platform with nothing to ask. */
	const val REJECT_UNSUPPORTED = "C15T_TRACKING_UNSUPPORTED"

	/**
	 * What a host hears when it asks Android for tracking authorization.
	 *
	 * It names the substitute rather than only the refusal, because the host's real
	 * question is whether it may run tracking here, and the answer is that the c15t
	 * decision is the only gate on this platform.
	 */
	const val MESSAGE_UNSUPPORTED =
		"Android has no platform tracking prompt for c15t to request, so nothing was " +
			"asked. Tracking readiness reports `unsupported` here, which means the " +
			"platform adds no gate and the c15t decision alone decides; the advertising " +
			"identifier belongs to Google Play services, which this package does not " +
			"depend on. Nothing about consent changed."
}
