/**
 * The one place a consent answer and a platform answer are read together.
 *
 * `native/CONTRACT.md` states the rule this file enforces: ATT on iOS and the
 * advertising-identifier permission on Android are platform gates, not consent,
 * and no platform authorization moves a category from `denied` or `pending` to
 * `granted`. The two answers are combined here and nowhere else, so the
 * direction of the combination is auditable in one file: consent decides whether
 * the subject allowed it, the platform decides whether the OS allows it, and the
 * only way either one is satisfied is by both being satisfied.
 *
 * Nothing here reads a snapshot or a bridge. Both inputs arrive as arguments, so
 * the invariant holds for a Swift caller, a Kotlin caller, and a JavaScript
 * caller that assembled the two answers itself.
 */

import type { TrackingAuthorization } from '../protocol';
import type { ConsentDecision } from './selectors';

/**
 * Whether the platform half of a tracking gate is satisfied.
 *
 * Two arms let tracking through. `authorized` is Apple saying yes. `unsupported`
 * means the platform asks nothing of this build, which is Android's honest
 * answer, and iOS's answer when the binary carries no
 * `NSUserTrackingUsageDescription` and so has no prompt to show. Neither arm is
 * permission to track anything the subject refused: the consent half is checked
 * separately, by {@link isTrackingPermitted}.
 *
 * `not-determined` and `restricted` hold tracking off. The first is a subject who
 * has not been asked, which is the state an analytics SDK must not read as a yes;
 * the second is a device policy no app can change.
 *
 * @param authorization - The arm the native core reported.
 * @returns `true` when the platform adds no bar in front of tracking.
 */
export const isPlatformTrackingSatisfied = function isPlatformTrackingSatisfied(
	authorization: TrackingAuthorization
): boolean {
	return authorization === 'authorized' || authorization === 'unsupported';
};

/**
 * Whether tracking behaviour may run, given both answers.
 *
 * Both halves have to say yes, and the consent half decides alone in one
 * direction: no platform arm turns `denied` or `pending` into permission. A
 * device with ATT authorized and `measurement` denied is denied, and the
 * advertising identifier stays unavailable with it. A device whose policy has not
 * resolved stays unresolved no matter what Apple reported, because `pending` is a
 * wait and an OS prompt does not end a wait.
 *
 * This is the primitive an analytics or ad SDK gates on, and it is deliberately
 * not the same question as {@link isPlatformTrackingSatisfied}: a category the
 * subject granted on a device where Apple says no is still off.
 *
 * @example
 * ```ts
 * // `necessary` never reaches a tracking gate: it is not a tracking category.
 * const allowed = isTrackingPermitted(
 *     client.decision('marketing'),
 *     client.getTrackingAuthorization()
 * );
 * ```
 *
 * @param decision - The c15t answer for the category being gated.
 * @param authorization - What the platform reported about tracking.
 * @returns `true` only when consent is granted and the platform is satisfied.
 */
export const isTrackingPermitted = function isTrackingPermitted(
	decision: ConsentDecision,
	authorization: TrackingAuthorization
): boolean {
	return decision === 'granted' && isPlatformTrackingSatisfied(authorization);
};
