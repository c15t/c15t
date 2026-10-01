/**
 * The context that carries the host's safe-area measurements.
 *
 * The consent kernel owns consent state and nothing about the screen, so the
 * insets arrive from the app: it already runs an inset source, usually
 * `react-native-safe-area-context`, and passing the numbers here keeps this
 * package free of a peer it cannot import conditionally. Metro resolves every
 * static `import` at bundle time, so an optional peer read from inside the
 * bundle is a hard resolution failure for the hosts that did not install it.
 *
 * The value is the raw measurement, never a fallback. Keeping the two apart is
 * what lets {@link useConsentSafeArea} say which one a surface laid out against.
 */

import { createContext, useContext } from 'react';

/** System-reserved bands, in density-independent pixels. */
export interface ConsentSafeAreaInsets {
	/** Band along the bottom edge, such as an iOS home indicator. */
	readonly bottom: number;
	/** Band along the leading edge, which a notch sets in landscape. */
	readonly left: number;
	/** Band along the trailing edge. */
	readonly right: number;
	/** Band along the top edge, such as a status bar or a Dynamic Island. */
	readonly top: number;
}

/**
 * Context holding the insets the host measured, or `null` when it measured
 * nothing.
 */
export const ConsentSafeAreaContext =
	createContext<ConsentSafeAreaInsets | null>(null);

/**
 * Read the insets the nearest {@link C15tProvider} was given.
 *
 * @returns The host's measurements, or `null` when the host supplies none.
 */
export const useConsentSafeAreaInsets =
	function useConsentSafeAreaInsets(): ConsentSafeAreaInsets | null {
		return useContext(ConsentSafeAreaContext);
	};
