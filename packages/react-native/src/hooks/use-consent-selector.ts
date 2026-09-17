/**
 * The subscription hook every other hook in this package is built on.
 *
 * `useSyncExternalStore` rerenders whatever it notifies, and it offers no
 * equality argument, so the filtering has to happen before React is told
 * anything. It does: the client compares each subscriber's selected value
 * and stays quiet when nothing moved. That makes the store snapshot here the
 * whole snapshot object, which the client keeps identical until the native
 * bytes change, and the selection a memo of that object.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { SnapshotEquality, SnapshotSelector } from '../native/client';
import type { ConsentSnapshot } from '../protocol';
import { useConsentClient } from '../provider/consent-context';

/**
 * Subscribe to one slice of the native snapshot.
 *
 * The component rerenders only when the selected value changes under `equals`,
 * so a marketing grant does not touch a component watching `activeUI`.
 *
 * Pass a `selector` that outlives the render: hoist it to module scope or wrap
 * it in `useCallback`. An inline arrow is new on every render, which makes
 * React resubscribe each time. That stays correct, and it stays cheap because
 * a resubscribe reads the cached snapshot, but it is wasted work.
 *
 * @example
 * ```tsx
 * const measurementAllowed = useConsentSelector(
 *     (snapshot) => snapshot.effectivePermissions.measurement
 * );
 * ```
 *
 * @param selector - Slice to watch, read from the current snapshot.
 * @param equals - Equality for the selected value. Defaults to `Object.is`.
 * @returns The value the selector produces for the current snapshot.
 */
export const useConsentSelector = <ResultType>(
	selector: SnapshotSelector<ResultType>,
	equals: SnapshotEquality<ResultType> = Object.is
): ResultType => {
	const client = useConsentClient();

	const subscribe = useCallback(
		(onStoreChange: () => void) =>
			client.subscribe<ResultType>(selector, onStoreChange, equals),
		[client, equals, selector]
	);

	// Safe as a store snapshot: the client hands back one frozen object per
	// distinct native payload, never a fresh parse.
	const getSnapshot = useCallback(
		(): ConsentSnapshot => client.getSnapshot(),
		[client]
	);

	const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	return useMemo(() => selector(snapshot), [selector, snapshot]);
};
