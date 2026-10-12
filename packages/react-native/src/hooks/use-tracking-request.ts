/**
 * Run a whole Apple tracking request, prompt sheet and preference centre together.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ConsentDecision } from '../lib/selectors';
import {
	DEFAULT_TRACKING_CATEGORIES,
	isAdditionalInformationPause,
	MAX_TRACKING_REQUEST_TURNS,
	mayAskPlatformAgain,
} from '../lib/tracking-journey';
import type {
	TrackingAuthorization,
	TrackingRequestPayload,
} from '../protocol';
import type { OptionalConsentCategory } from '../protocol/vocabulary';
import { useConsentClient } from '../provider/consent-context';
import { useTrackingAuthorization } from './use-tracking-authorization';

/**
 * Options for {@link useTrackingRequest}.
 */
export interface UseTrackingRequestOptions {
	/**
	 * The categories this request stands for.
	 *
	 * Decides whether the sheet may be shown again after the preference centre
	 * closes: it comes back while any one of these is granted, and a subject who
	 * refused all of them is finished without another Apple prompt. Defaults to
	 * {@link DEFAULT_TRACKING_CATEGORIES}. Pass the narrower list when your policy
	 * gates tracking on one category, so a refusal of that one is enough to end the
	 * journey.
	 */
	readonly categories?: readonly OptionalConsentCategory[];
	/**
	 * The props the host already passes to its own {@link ConsentPreferences}.
	 *
	 * Pass them and one centre serves both purposes: `open` comes back true when either
	 * the host opened it or this journey asked for it, and `onRequestClose` runs the
	 * host's alongside the journey's. A host that already renders a preference centre
	 * from its own state needs this, because spreading without it would replace the
	 * host's `open` and leave a centre only this journey can close.
	 *
	 * Leave it out when this journey owns the centre, and the returned props are the
	 * only ones that centre takes.
	 */
	readonly preferences?: TrackingRequestPreferences;
}

/**
 * The props to spread onto {@link ConsentPreferences} for this journey.
 *
 * Spread these onto one {@link ConsentPreferences}. `open` is true while Apple's Additional
 * Information button is waiting to be answered and while the host's own `open` is true, so a
 * host that already keeps a centre in its state passes that state in as
 * {@link UseTrackingRequestOptions.preferences} and the spread stays the whole story.
 * Without that option the journey owns the centre outright, and it is the only thing that
 * opens it.
 */
export interface TrackingRequestPreferences {
	/** Called when the subject closes the centre, saved or not. */
	readonly onRequestClose: () => void;
	/** Whether the centre should be open for this journey. */
	readonly open: boolean;
}

/**
 * What {@link useTrackingRequest} hands back.
 */
export interface TrackingRequest {
	/**
	 * The platform arm, kept live.
	 *
	 * Same value as {@link useTrackingAuthorization}, refreshed when the app returns to the
	 * foreground. Read it to decide whether to offer the button at all; it is never a consent
	 * answer, so gate behaviour on {@link useIsTrackingAllowed}.
	 */
	readonly authorization: TrackingAuthorization;
	/** Whether a request is in flight, so a button can disable itself. */
	readonly pending: boolean;
	/** Props for {@link ConsentPreferences}. */
	readonly preferences: TrackingRequestPreferences;
	/**
	 * Ask the platform, all the way through.
	 *
	 * Resolves with the outcome that ended the journey. Calling it again while a request is
	 * already running joins that one instead of starting a second, so a double-tap cannot
	 * stack prompts.
	 *
	 * @returns The final outcome, or the last one seen if the platform keeps pausing.
	 */
	request: () => Promise<TrackingRequestPayload>;
}

/**
 * Ask Apple for tracking authorization without assembling the journey by hand.
 *
 * One hook, one call, and the whole Apple flow is driven: the expanded European Union sheet
 * where the runtime has it, the plain alert everywhere else, and the preference centre when
 * the subject taps Additional Information. Nothing here is Android-specific or
 * iOS-27-specific, because the platform question is answered by the same bridge on every
 * path: on Android the request rejects with `C15T_TRACKING_UNSUPPORTED`, and on an iOS
 * binary without the expanded call Apple's standard prompt runs exactly as it does today.
 * A host that calls `request()` on all three devices needs no branch.
 *
 * The part that needs thinking about is Apple's Additional Information button. It closes the
 * sheet with no answer recorded, runs the app's own closure, and completes with
 * `not-determined`. This hook treats that as a pause: it opens the preference centre, waits
 * for the subject to close it, and then asks Apple again only while a category the request
 * stood for is granted. Refusing every one of them ends the journey without a second prompt,
 * and the arm Apple reported travels unchanged, so a subject who paused never comes back as
 * having refused.
 *
 * Apple's answer stays Apple's answer. Pressing Allow writes no consent, and this hook never
 * calls {@link ConsentActions.acceptAll} or saves a category on the strength of a platform
 * yes. Consent still comes from the c15t surfaces, and a category that is still unresolved
 * after the journey is still unresolved: the tracking gate reads it as off, which is the
 * point of {@link useIsTrackingAllowed}.
 *
 * A host with no branch of its own still needs a `catch`: on Android the request rejects
 * with `C15T_TRACKING_UNSUPPORTED` because there is nothing to ask, which is a normal
 * answer there rather than a failure. See the example.
 *
 * Mount one {@link ConsentPreferences} near the root and spread what this hands back onto
 * it; nothing opens until the subject asks for more detail. A host whose centre is already
 * bound to its own `open` state passes that state as
 * {@link UseTrackingRequestOptions.preferences} instead of mounting a second card.
 *
 * A host that mounts nothing is not broken: the journey stops at the pause and resolves
 * with it, so the centre is what lets the detour finish rather than what lets it start.
 *
 * @example
 * ```tsx
 * import { ConsentPreferences, useTrackingRequest } from '@c15t/react-native';
 *
 * function PersonalizeButton() {
 * 	const tracking = useTrackingRequest({ categories: ['marketing'] });
 *
 * 	const ask = async (): Promise<void> => {
 * 		try {
 * 			await tracking.request();
 * 		} catch {
 * 			// Android always gets here: there is no Apple prompt to show. The c15t
 * 			// decision is the only gate, so carry on and let
 * 			// `useIsTrackingAllowed()` decide what may actually run.
 * 		}
 * 	};
 *
 * 	return (
 * 		<>
 * 			<Button disabled={tracking.pending} onPress={ask} title="Use personalised ads" />
 * 			<ConsentPreferences {...tracking.preferences} />
 * 		</>
 * 	);
 * }
 * ```
 *
 * @param options - Which categories the request stands for.
 * @returns The live platform arm, the request, and the preference-centre props.
 */
export const useTrackingRequest = function useTrackingRequest(
	options: UseTrackingRequestOptions = {}
): TrackingRequest {
	const client = useConsentClient();
	const categories = options.categories ?? DEFAULT_TRACKING_CATEGORIES;
	const authorization = useTrackingAuthorization();

	/**
	 * The categories the request stands for, read when the journey needs them.
	 *
	 * Callers write this as an inline literal, so it is a fresh array on every render.
	 * Nothing about the journey depends on that identity: the list is read once, after
	 * a dialog closes, and threading it through `request`'s dependencies would give
	 * `request` a new identity each render for no reason, which is how a host ends up
	 * with a button that will not stay memoized.
	 */
	const requestedCategories = useRef(categories);

	/** The host's own centre state, so one card serves the app and this journey. */
	const hostOpen = options.preferences?.open ?? false;
	const hostRequestClose = options.preferences?.onRequestClose;

	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);

	/** Resolves the wait on the preference centre, from `onRequestClose` or unmount. */
	const resolvePreferences = useRef<(() => void) | null>(null);
	/** The journey in flight, so a second press joins it rather than stacking a prompt. */
	const inFlight = useRef<Promise<TrackingRequestPayload> | null>(null);
	/** Whether this tree still exists, so a late close cannot set state on it. */
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;

		return () => {
			mounted.current = false;

			// A subject who navigated away mid-journey has cancelled it, and the awaiting
			// loop has to be told rather than left holding a promise nothing will settle.
			// The close runs before the loop asks Apple again, which is the one ordering
			// that matters: an abandoned journey must not surface a sheet behind them.
			const release = resolvePreferences.current;
			resolvePreferences.current = null;
			release?.();
		};
	}, []);

	const closePreferences = useCallback((): void => {
		if (mounted.current) {
			setOpen(false);
		}

		const release = resolvePreferences.current;
		resolvePreferences.current = null;
		release?.();

		// The card this journey opened may be the host's own. Leaving their `open` true
		// would trap a sheet the subject has already dismissed, so both closes run.
		hostRequestClose?.();
	}, [hostRequestClose]);

	useEffect((): void => {
		requestedCategories.current = categories;
	}, [categories]);

	const decisionsForRequest = useCallback((): Partial<
		Record<OptionalConsentCategory, ConsentDecision>
	> => {
		// Read after the preference centre closes, never before. The decision the
		// subject just made is the input, and a read taken when the journey started
		// would still hold the choices they have just changed.
		const decisions: Partial<Record<OptionalConsentCategory, ConsentDecision>> =
			{};

		for (const category of requestedCategories.current) {
			decisions[category] = client.decision(category);
		}

		return decisions;
	}, [client]);

	const request = useCallback((): Promise<TrackingRequestPayload> => {
		const alreadyRunning = inFlight.current;

		if (alreadyRunning) {
			// A second press joins the journey already running. Two journeys waiting on
			// one preference centre would leave one of them holding a prompt that never
			// arrives, because a single close can only release one waiter.
			return alreadyRunning;
		}

		// One turn of the journey, recursing rather than looping. Each turn costs the
		// subject a tap, which is what makes the sequence safe to await one at a time:
		// the waits are not independent work that belongs in `Promise.all`, they are a
		// person answering a dialog. `remaining` is the brake for a platform that
		// reported a pause without showing anything, which would otherwise recurse as
		// fast as the bridge answers.
		const turn = async (remaining: number): Promise<TrackingRequestPayload> => {
			const outcome = await client.requestTracking();

			if (!isAdditionalInformationPause(outcome) || remaining <= 1) {
				return outcome;
			}

			await new Promise<void>((resolve) => {
				resolvePreferences.current = resolve;

				if (mounted.current) {
					setOpen(true);
				}
			});

			if (
				!mounted.current ||
				!mayAskPlatformAgain(requestedCategories.current, decisionsForRequest())
			) {
				return outcome;
			}

			return turn(remaining - 1);
		};

		// Both exits have to release the flight, and a `finally` is off limits: the React
		// Compiler cannot analyse a `try` without a `catch`, and this hook is meant to
		// survive compilation. Settling in both arms costs two calls and keeps it honest.
		const release = (): void => {
			inFlight.current = null;

			if (mounted.current) {
				setPending(false);
			}
		};

		const flight = (async (): Promise<TrackingRequestPayload> => {
			setPending(true);

			try {
				const outcome = await turn(MAX_TRACKING_REQUEST_TURNS);
				release();

				return outcome;
			} catch (error: unknown) {
				release();

				throw error;
			}
		})();

		inFlight.current = flight;

		return flight;
	}, [client, decisionsForRequest]);

	const preferences = useMemo<TrackingRequestPreferences>(
		() => ({ onRequestClose: closePreferences, open: open || hostOpen }),
		[closePreferences, hostOpen, open]
	);

	return {
		authorization,
		pending,
		preferences,
		request,
	};
};
