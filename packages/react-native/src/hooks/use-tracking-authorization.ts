/**
 * Read the platform tracking answer.
 */

import { useCallback, useSyncExternalStore } from 'react';

import type { TrackingAuthorization } from '../protocol';
import { useConsentClient } from '../provider/consent-context';

/**
 * What the operating system says about tracking, on its own.
 *
 * This is not a consent hook and must not be used as one. It answers the
 * platform half of the question only: Apple's App Tracking Transparency answer on
 * iOS, and `unsupported` on Android, where the advertising identifier sits behind
 * Google Play services' own consent surface rather than anything this package
 * reads. Gate behaviour on {@link useIsTrackingAllowed}, which combines this with
 * the c15t decision.
 *
 * The value moves when {@link ConsentActions.requestTrackingAuthorization}
 * resolves, and when the app comes back to the foreground. The second is there
 * because Apple does not tell a running process that the Settings app changed
 * the answer: a subject who turns tracking off and comes straight back would
 * otherwise leave the app reading `authorized` until the next launch, which is
 * the direction of error worth closing. {@link C15tProvider} does the re-read.
 *
 * {@link useTrackingRequest} drives the request itself and opens the preference
 * centre when Apple asks for more detail, which is what most hosts want.
 *
 * @example
 * ```tsx
 * const authorization = useTrackingAuthorization();
 *
 * // Show "Allow tracking" yourself, after the consent UI, only while the
 * // platform is still waiting to be asked.
 * const canAsk = authorization === 'not-determined';
 * ```
 *
 * @returns The arm the native core reported.
 */
export const useTrackingAuthorization =
	function useTrackingAuthorization(): TrackingAuthorization {
		const client = useConsentClient();

		const subscribe = useCallback(
			(onStoreChange: () => void) => client.subscribeTracking(onStoreChange),
			[client]
		);

		// Safe as a store snapshot: the client reads the bridge once and hands back
		// the same string from then on.
		const getSnapshot = useCallback(
			(): TrackingAuthorization => client.getTrackingAuthorization(),
			[client]
		);

		return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	};
