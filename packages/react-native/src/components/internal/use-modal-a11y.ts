/**
 * Screen-reader containment and initial focus for an open surface.
 *
 * React Native has no DOM focus stack, so a focus trap on device is three real
 * mechanisms rather than one abstraction: `accessibilityViewIsModal` keeps
 * VoiceOver and TalkBack inside the sheet, `setAccessibilityFocus` moves the
 * reader to it when it opens, and `BackHandler` gives Android an exit. The
 * container is also `accessible`, which is what makes it one stop in the reader
 * rather than an unreachable wrapper.
 *
 * A surface rendered inside `Modal` gets the back gesture from the platform
 * already, and subscribing here as well would close it twice, so those surfaces
 * pass `hardwareBack: false`.
 */

import { useEffect, useRef } from 'react';
import type { Ref, RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform } from 'react-native';
import type { View } from 'react-native';

import { useHardwareBack } from './use-hardware-back';

/**
 * What a `View` ref actually holds.
 *
 * React Native types the instance but does not export the name, so it comes off
 * the component's own props rather than being written out.
 */
export type SurfaceInstance =
	NonNullable<React.ComponentProps<typeof View>['ref']> extends Ref<
		infer InstanceType
	>
		? InstanceType
		: never;

/** What {@link useModalA11y} hands a surface. */
export interface ModalA11y {
	/** Ref to put on the sheet container. */
	readonly containerRef: RefObject<SurfaceInstance | null>;
	/** Accessibility props to spread on the sheet container. */
	readonly containerProps: {
		readonly accessible: true;
		readonly accessibilityViewIsModal: true;
		readonly collapsable: false;
	};
}

/**
 * Wire containment, initial focus, and the Android back gesture.
 *
 * @param options - Inputs.
 * @param options.active - Whether the surface is open.
 * @param options.hardwareBack - Whether to take the Android back gesture here.
 * @param options.onRequestClose - Called for a hardware back press.
 * @returns The container ref and its accessibility props.
 */
export const useModalA11y = function useModalA11y({
	active,
	hardwareBack = true,
	onRequestClose,
}: {
	readonly active: boolean;
	readonly hardwareBack?: boolean;
	readonly onRequestClose?: (() => void) | undefined;
}): ModalA11y {
	const containerRef = useRef<SurfaceInstance | null>(null);

	useHardwareBack(active && hardwareBack, onRequestClose);

	useEffect(() => {
		if (!active) {
			return;
		}

		// The reader needs a frame to settle on the new subtree before a tag is
		// meaningful, and an unmounted sheet has no tag to move to.
		const frame = requestAnimationFrame(() => {
			const tag = findNodeHandle(containerRef.current);

			if (typeof tag === 'number') {
				AccessibilityInfo.setAccessibilityFocus(tag);
			}
		});

		return () => {
			cancelAnimationFrame(frame);
		};
	}, [active]);

	return {
		containerProps: {
			accessibilityViewIsModal: true,
			// Android drops an unlabelled container from the reader tree when it
			// is not explicitly accessible.
			accessible: true,
			collapsable: false,
		},
		containerRef,
	};
};

/** Whether the running platform needs a back-handler subscription at all. */
export const platformNeedsBackHandler =
	function platformNeedsBackHandler(): boolean {
		return Platform.OS === 'android';
	};
