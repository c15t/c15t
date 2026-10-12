import { useMemo } from 'react';
import type { Ref, RefCallback } from 'react';

/**
 * Combine refs so one element fills all of them.
 *
 * @param refs - Callback refs, object refs, or `undefined`.
 * @returns A callback ref that calls or assigns each ref in order.
 * @internal
 */
export const composeRefs = function composeRefs<ElementType>(
	...refs: (Ref<ElementType> | undefined)[]
): RefCallback<ElementType> {
	return (node) => {
		for (const ref of refs) {
			if (typeof ref === 'function') {
				ref(node);
				continue;
			}

			if (ref && 'current' in ref) {
				ref.current = node;
			}
		}
	};
};

/**
 * {@link composeRefs} for two refs, with a stable identity while they stay
 * the same, so React does not detach and reattach the element on every
 * render.
 *
 * @param first - A callback ref, object ref, or `undefined`.
 * @param second - A callback ref, object ref, or `undefined`.
 * @returns A memoized callback ref.
 * @internal
 */
export const useComposedRefs = function useComposedRefs<ElementType>(
	first: Ref<ElementType> | undefined,
	second: Ref<ElementType> | undefined
): RefCallback<ElementType> {
	return useMemo(() => composeRefs(first, second), [first, second]);
};
