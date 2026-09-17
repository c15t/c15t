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

/**
 * Props for {@link C15tProvider}.
 */
export interface C15tProviderProps {
	/** The app subtree that may read consent. */
	readonly children: ReactNode;
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
 * @returns The children, with consent available through the hooks.
 * @throws {NativeC15tUnavailableError} When the native module is not in the
 *   running binary, for example in Expo Go.
 * @throws {C15tProtocolMismatchError} When the embedded native build speaks a
 *   protocol this bundle does not support. The message names both sides and the
 *   fix, which is a rebuild rather than a JavaScript update.
 */
export const C15tProvider = ({ children }: C15tProviderProps): ReactNode => {
	const inherited = useContext(ConsentClientContext);

	// The handshake runs here, during render, on purpose. A binary that cannot
	// speak this protocol is a configuration error, and the app should stop at
	// the provider rather than render a consent UI over state it cannot trust.
	const client = useMemo(() => inherited ?? getConsentClient(), [inherited]);

	return (
		<ConsentClientContext.Provider value={client}>
			{children}
		</ConsentClientContext.Provider>
	);
};
