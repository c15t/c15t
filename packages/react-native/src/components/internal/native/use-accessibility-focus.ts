/**
 * Move the screen reader to one element.
 *
 * A pushed screen, an opened sheet, and a standalone page each hand focus to
 * their title, which is what VoiceOver and TalkBack do for a system navigation
 * push. Focusing a container instead would make iOS read the whole sheet as one
 * element, or nothing at all on Android.
 */

import { useEffect, useRef } from 'react';
import type { ComponentProps, Ref, RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle } from 'react-native';
import type { View } from 'react-native';

/**
 * The host instance behind a `View` or `Text` ref.
 *
 * React Native types the instance but does not export the name, so it comes off
 * the component's own props rather than being written out.
 */
export type SurfaceInstance =
	NonNullable<ComponentProps<typeof View>['ref']> extends Ref<
		infer InstanceType
	>
		? InstanceType
		: never;

/**
 * Focus the referenced element each time `active` turns true.
 *
 * @param active - Whether the element's screen is the one in front.
 * @returns The ref to put on the element.
 */
export const useAccessibilityFocus = function useAccessibilityFocus(
	active: boolean
): RefObject<SurfaceInstance | null> {
	const ref = useRef<SurfaceInstance | null>(null);

	useEffect(() => {
		if (!active) {
			return;
		}

		// The reader needs a frame to settle on the new subtree before a tag is
		// meaningful, and an unmounted element has no tag to move to.
		const frame = requestAnimationFrame(() => {
			const tag = findNodeHandle(ref.current);

			if (typeof tag === 'number') {
				AccessibilityInfo.setAccessibilityFocus(tag);
			}
		});

		return () => {
			cancelAnimationFrame(frame);
		};
	}, [active]);

	return ref;
};
