/**
 * What to do with an Apple tracking request that paused instead of answering.
 *
 * Apple's European Union sheet has an Additional Information button, and pressing it does
 * three things at once: the sheet closes without recording an answer, the app's own closure
 * runs, and Apple still completes the request with `not-determined`. So the app has to
 * decide what happens next, and the two ways to get that wrong are both visible to the
 * subject. Going straight back to Apple loses the information the subject stopped to read,
 * and treating the pause as an answer tells them they refused something they never chose.
 *
 * Nothing in this file renders, subscribes, or touches a bridge. It takes the outcome the
 * platform reported and the consent decisions already stored, and returns one of two
 * instructions. That is deliberate: the same three questions have to be asked from a React
 * tree today and from native UI later, and a rule that lives inside a component can only be
 * asked once.
 */

import type { TrackingRequestPayload } from '../protocol';
import type { OptionalConsentCategory } from '../protocol/vocabulary';
import type { ConsentDecision } from './selectors';

/**
 * The categories a tracking request is treated as standing for, when a host names none.
 *
 * This is a default for one decision in this file and not a mapping from c15t categories
 * onto legal bases. `necessary` is excluded because it is not a tracking behaviour and the
 * platform gate has nothing to say about it, which {@link isTrackingPermitted} already says.
 * The other two optional categories that can carry an identifier are `measurement` and
 * `marketing`. A policy that puts tracking somewhere else, or that gates tracking on only
 * one of these two, passes {@link UseTrackingRequestOptions.categories} and this list stops
 * being involved.
 */
export const DEFAULT_TRACKING_CATEGORIES = [
	'measurement',
	'marketing',
] as const satisfies readonly OptionalConsentCategory[];

/**
 * How many times one user action may send the subject back to Apple.
 *
 * The journey is a loop, and every turn of it is meant to cost a tap: Apple's sheet, then
 * the preference centre, then the sheet again. A platform that returned
 * `additional-information` without showing anything would otherwise spin the loop as fast as
 * the bridge answers, which reads as a frozen app rather than as a broken prompt. Five is
 * more than anyone answers a permission dialog and fewer than a hundred bridge calls before
 * a user force-quits.
 */
export const MAX_TRACKING_REQUEST_TURNS = 5;

/**
 * Whether an answered tracking request may go back to Apple.
 *
 * The rule is the subject's own: after they have been through the preference centre, the
 * sheet comes back only while at least one of the categories the request was standing for is
 * granted. Refusing every one of them finishes the journey where it stands, because sending
 * someone to a tracking prompt whose answer has already been overridden in your own UI is
 * worse than not asking, and Apple's sheet cannot see a c15t category.
 *
 * A `pending` category does not count as granted. A policy that has not resolved is a wait,
 * and a platform prompt does not end a wait, whatever the arm Apple reported.
 *
 * This never reads the platform arm to decide. An `authorized` result that paused is
 * contradictory, and inventing a reading for it is how a manufactured status gets written
 * into a journey that Apple never reported.
 *
 * @param categories - The categories the request stands for.
 * @param decisions - The stored decision for each of those categories.
 * @returns `true` when at least one is granted.
 */
export const mayAskPlatformAgain = function mayAskPlatformAgain(
	categories: readonly OptionalConsentCategory[],
	decisions: Readonly<Partial<Record<OptionalConsentCategory, ConsentDecision>>>
): boolean {
	return categories.some((category) => decisions[category] === 'granted');
};

/**
 * Whether this outcome means the subject asked to be told more.
 *
 * One line rather than an inline compare, because the same question is asked by the hook, by
 * the tests, and by anything that renders state on the strength of it, and a stage renamed on
 * one side has to fail somewhere obvious.
 *
 * @param outcome - What the platform reported.
 * @returns `true` when Apple paused for additional information.
 */
export const isAdditionalInformationPause =
	function isAdditionalInformationPause(
		outcome: TrackingRequestPayload
	): boolean {
		return outcome.stage === 'additional-information';
	};
