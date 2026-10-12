'use client';

import { useInsertionEffect, useRef } from 'react';

/**
 * A ref that holds `value` from the render React most recently committed.
 *
 * Consent guards use it to answer "is this still the kernel, draft or IAB
 * selection this component renders?" when a kept callback runs, including
 * from a descendant's layout effect in the very commit that switched
 * runtimes.
 *
 * Why an insertion effect: React runs insertion effects while it applies a
 * commit, before any layout effect of that commit, and never for a render it
 * discards. Assigning the ref during render would publish values from
 * renders React throws away (an interrupted concurrent render, StrictMode's
 * second render). A layout effect is too late, because descendants' layout
 * effects run before their ancestors'. A passive effect is later still.
 * Assigning the committed value is idempotent, so StrictMode's replayed
 * effects cannot leave a stale value behind.
 *
 * @param value - The value this render uses.
 * @returns A ref whose `current` is the last committed `value`.
 * @internal
 */
export const useCommittedRef = function useCommittedRef<Value>(value: Value): {
	readonly current: Value;
} {
	const ref = useRef(value);
	useInsertionEffect(() => {
		ref.current = value;
	}, [value]);
	return ref;
};
