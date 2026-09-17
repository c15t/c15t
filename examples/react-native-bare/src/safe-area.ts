/**
 * The system bands this app keeps its chrome out of.
 *
 * The example carries no safe-area library on purpose: every extra native module
 * here is one more thing that has to build before the consent path can be checked.
 * React Native core reports the one band that matters for a heading, and the
 * package's own reserved floor covers the rest, which is enough to put nothing
 * under the clock or the home indicator.
 *
 * The numbers go to `C15tProvider` as well, so the consent surfaces lay out
 * against the same measurement as the tab bar above them rather than against a
 * second guess at the same hardware.
 */

import type { ConsentSafeAreaInsets } from '@c15t/react-native';
import { useMemo } from 'react';
import { NativeModules, Platform, StatusBar } from 'react-native';

/**
 * Bottom band reserved for a home indicator or navigation bar.
 *
 * This is the package's `RESERVED_BOTTOM_INSET`: the accessibility interaction
 * minimum, reused as a floor because it is wider than the widest inset Apple
 * ships (34 on a Face ID iPhone, 20 on an iPad). Core React Native reports no
 * bottom band on either platform, so the floor is the honest answer here, and the
 * surfaces would reserve exactly the same one if this app measured nothing.
 */
const RESERVED_BOTTOM = 44;

/** The slice of RN's iOS status bar module this file reads. */
interface StatusBarModule {
	/** Returns `statusBarFrame.height` in points, the top band on iPhone. */
	getConstants?: () => { HEIGHT?: number };
}

/**
 * The top band, as reported by the platform.
 *
 * Android reports the status bar height directly. iOS exposes the same number
 * through its status bar module, read once, which holds for this app because the
 * iPhone build is portrait-only in `Info.plist` and the band does not move.
 */
const readTopInset = (): number => {
	const clamp = (value: number | null | undefined): number =>
		typeof value === 'number' && Number.isFinite(value) && value > 0
			? value
			: 0;

	if (Platform.OS === 'android') {
		return clamp(StatusBar.currentHeight);
	}

	const module = NativeModules.StatusBarManager as StatusBarModule | undefined;

	return clamp(module?.getConstants?.()?.HEIGHT);
};

/**
 * The bands in force, in density-independent pixels.
 *
 * @returns Insets to pad the chrome with and to hand the consent provider.
 */
export const useSafeAreaInsets = (): ConsentSafeAreaInsets => {
	// Read during render, not in an effect: a measurement that lands a frame late
	// pushes the tab bar down under the clock for one frame, which is the exact
	// overlap this exists to prevent.
	const top = readTopInset();

	return useMemo(
		() => ({ bottom: RESERVED_BOTTOM, left: 0, right: 0, top }),
		[top]
	);
};
