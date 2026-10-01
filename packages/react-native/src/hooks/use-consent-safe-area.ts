/**
 * The bands a consent surface has to keep clear, and how honest the answer is.
 *
 * Two sources exist, and they are not equally good:
 *
 * - The host measured them. Pass the numbers to `C15tProvider` and every
 *   surface lays out against the real thing, which is what a notched iPhone
 *   needs. A host reading them from `react-native-safe-area-context` gets
 *   rotation, keyboard, and the collapsing iOS home indicator for free, because
 *   that library hands back a new object and React rerenders the surfaces.
 * - Nothing was measured, so the surface reserves a floor instead. The floor is
 *   the accessibility interaction minimum, which is not a guess at any one
 *   device's hardware and still keeps a control out of every band Apple ships.
 *
 * The reserve is a floor and not a measurement, so {@link ConsentSafeArea} says
 * which of the two a surface was laid out against.
 */

import { useMemo } from 'react';
import { Platform, StatusBar } from 'react-native';

import { MIN_TAP_TARGET } from '../components/theme/consent-theme-parts';
import { useConsentSafeAreaInsets } from '../provider/safe-area-context';
import type { ConsentSafeAreaInsets } from '../provider/safe-area-context';

/**
 * Bottom band reserved when the host measured nothing.
 *
 * This is the 44-point interaction minimum the theme already enforces for a
 * control, reused as a floor: it is wider than the widest home-indicator inset
 * Apple ships (34 on a Face ID iPhone, 20 on an iPad), so a banner mounted by
 * an app that installed nothing still keeps its buttons out of the indicator.
 * The Android 3-button navigation bar is the one band it does not fully cover,
 * which is why the measured path is the one to wire up there.
 */
export const RESERVED_BOTTOM_INSET = MIN_TAP_TARGET;

/** The bands in force, plus whether anything measured them. */
export interface ConsentSafeArea extends ConsentSafeAreaInsets {
	/**
	 * Whether {@link ConsentSafeAreaInsets} came from the host rather than from
	 * the floor this module falls back to.
	 */
	readonly measured: boolean;
}

/**
 * Resolve the bands a render should lay out against.
 *
 * Pure, so a test can drive both sources without a screen.
 *
 * @param insets - The host's measurements, or `null` when it has none.
 * @returns The bands in force, clamped to non-negative numbers.
 */
export const resolveConsentSafeArea = function resolveConsentSafeArea(
	insets: ConsentSafeAreaInsets | null
): ConsentSafeArea {
	const clamp = (value: number | undefined): number =>
		typeof value === 'number' && Number.isFinite(value) && value > 0
			? value
			: 0;

	if (insets !== null) {
		return {
			bottom: clamp(insets.bottom),
			left: clamp(insets.left),
			measured: true,
			right: clamp(insets.right),
			top: clamp(insets.top),
		};
	}

	// Android is the one platform React Native itself reports a band for, and
	// it reports it as the status bar height rather than a full `WindowInsets`
	// read: it misses the navigation bar and does not move with rotation. That
	// is enough to keep a heading off the clock, and nothing more.
	const androidTop =
		Platform.OS === 'android' ? clamp(StatusBar.currentHeight ?? 0) : 0;

	return {
		bottom: RESERVED_BOTTOM_INSET,
		left: 0,
		measured: false,
		right: 0,
		top: androidTop,
	};
};

/**
 * Read the safe-area bands the built-in surfaces lay out against.
 *
 * Use it when you build your own banner or sheet so your controls clear the
 * home indicator for the same reason the built-ins do. Outside a provider, or
 * when the provider was given nothing, this returns the reserved floor rather
 * than throwing: the floor is a real layout answer, not a missing one.
 *
 * @example
 * ```tsx
 * const safeArea = useConsentSafeArea();
 *
 * <View style={{ paddingBottom: safeArea.bottom }}>
 *     <AcceptButton />
 * </View>;
 * ```
 *
 * @returns The bands in force, and whether the host measured them.
 */
export const useConsentSafeArea =
	function useConsentSafeArea(): ConsentSafeArea {
		const insets = useConsentSafeAreaInsets();

		// Resolved on the measurement's identity, not on every render. A surface
		// memoizes its styles against this value, and a fresh object per render would
		// push every slot down a new one.
		return useMemo(() => resolveConsentSafeArea(insets), [insets]);
	};
