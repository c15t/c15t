/**
 * The provider: the one place that attaches JavaScript to the native instance
 * already running in the binary.
 *
 * It creates nothing. The native core was booted from a launch hook on iOS and
 * Android, hydration may already be done, and the subject id already exists.
 * The provider reads the handshake once, publishes the client, and gets out of
 * the way.
 */

import type { ReactNode } from 'react';
import { useContext, useMemo } from 'react';

import { getConsentClient } from '../native/client';
import { ConsentClientContext } from './consent-context';
import {
	ConsentSafeAreaContext,
	useConsentSafeAreaInsets,
} from './safe-area-context';
import type { ConsentSafeAreaInsets } from './safe-area-context';

/**
 * Props for {@link C15tProvider}.
 */
export interface C15tProviderProps {
	/** The app subtree that may read consent. */
	readonly children: ReactNode;
	/**
	 * The system-reserved bands to lay the consent surfaces outside of.
	 *
	 * Pass the live measurement, not a constant, so rotation and the collapsing
	 * iOS home indicator re-measure without a remount. A host already running
	 * `react-native-safe-area-context` reads these from `useSafeAreaInsets()`
	 * and hands them over; a host that measures nothing gets a reserved floor
	 * instead, documented on {@link useConsentSafeArea}.
	 *
	 * @example
	 * ```tsx
	 * import { useSafeAreaInsets } from 'react-native-safe-area-context';
	 *
	 * const insets = useSafeAreaInsets();
	 *
	 * <C15tProvider safeAreaInsets={insets}>
	 *     <Root />
	 * </C15tProvider>;
	 * ```
	 */
	readonly safeAreaInsets?: ConsentSafeAreaInsets;
}

/**
 * Publish the native consent state to the tree below it.
 *
 * Render it once, near the root. A nested provider reuses the ancestor's client
 * rather than attaching a second time, so a storybook or a test harness that
 * wraps an already-provided subtree cannot double the native listener.
 *
 * @example
 * ```tsx
 * import { C15tProvider } from '@c15t/react-native';
 *
 * export function App() {
 *     return (
 *         <C15tProvider>
 *             <Root />
 *         </C15tProvider>
 *     );
 * }
 * ```
 *
 * @param props - Provider props.
 * @param props.children - Subtree that may read consent.
 * @param props.safeAreaInsets - Bands the surfaces stay clear of, when the host
 *   measured them.
 * @returns The children, with consent available through the hooks.
 * @throws {NativeC15tUnavailableError} When the native module is not in the
 *   running binary, for example in Expo Go.
 * @throws {C15tProtocolMismatchError} When the embedded native build speaks a
 *   protocol this bundle does not support. The message names both sides and the
 *   fix, which is a rebuild rather than a JavaScript update.
 */
export const C15tProvider = ({
	children,
	safeAreaInsets,
}: C15tProviderProps): ReactNode => {
	const inherited = useContext(ConsentClientContext);
	const inheritedInsets = useConsentSafeAreaInsets();

	// The handshake runs here, during render, on purpose. A binary that cannot
	// speak this protocol is a configuration error, and the app should stop at
	// the provider rather than render a consent UI over state it cannot trust.
	const client = useMemo(() => inherited ?? getConsentClient(), [inherited]);

	// An inner provider that was given nothing keeps the ancestor's measurement
	// rather than dropping the tree back to the reserved floor.
	const source = safeAreaInsets ?? inheritedInsets;
	const { bottom, left, right, top } = source ?? {};

	// Keyed on the four numbers, not the object. A host that spreads a fresh
	// object on each of its own renders would otherwise push a new context value
	// down to every surface that reads the layout.
	const insets = useMemo(
		() =>
			bottom === undefined ||
			left === undefined ||
			right === undefined ||
			top === undefined
				? null
				: { bottom, left, right, top },
		[bottom, left, right, top]
	);

	return (
		<ConsentClientContext.Provider value={client}>
			<ConsentSafeAreaContext.Provider value={insets}>
				{children}
			</ConsentSafeAreaContext.Provider>
		</ConsentClientContext.Provider>
	);
};
