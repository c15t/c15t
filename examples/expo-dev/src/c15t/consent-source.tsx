/**
 * Which consent core this app is talking to, and how it gets remounted.
 *
 * Two paths, both public API:
 *
 * - `native` renders the package's `C15tProvider`, which reads the handshake from
 *   the Swift or Kotlin core in the binary. If the module is not there, the
 *   package throws with a message that names the cause, and this file catches it
 *   so the screen can show it rather than white-screening.
 * - `fake` builds the fake core in `./fake-native`, hands it to the package's own
 *   `createConsentClient`, and publishes the result through the package's
 *   `ConsentClientContext`. That is the same context the provider publishes, so
 *   every hook below behaves identically.
 *
 * A cold start is a new client under a new React `key`, which forces the whole
 * subtree to resubscribe. That is the same thing a process restart does.
 */

import {
	C15tProvider,
	ConsentClientContext,
	createConsentClient,
	getConsentClient,
	getNativeC15t,
	hasNativeC15tSurface,
} from '@c15t/react-native';
import type { ConsentClient } from '@c15t/react-native';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import type { ReactNode } from 'react';

import { config } from './config';
import { FakeNativeSdk } from './fake-native';
import type { FakeNativeSession } from './fake-native';

/**
 * The fake core, built once for the life of the JavaScript process.
 *
 * It carries the stored envelope, the log, and the sample history, which is exactly
 * what a restart has to survive, so a rerender must not build a second one. Its
 * constructor starts no timers; `start()` does.
 */
const fakeNativeSdk = new FakeNativeSdk({
	sampleIntervalMs: config.sampleIntervalMs,
});

/** Which core is behind the hooks right now. */
export type CoreKind = 'fake' | 'native';

/** What the fixture exposes about the running core. */
export interface ConsentSource {
	/** Force the fake core even though the real one is available. */
	readonly enableFake: () => void;
	/** The fake core, present only in fake mode. */
	readonly fake: FakeNativeSdk | null;
	/** Why the real core could not be used, if it could not. */
	readonly nativeError: Error | null;
	/** Rebuild the core from stored state. Fake mode only. */
	readonly restart: () => void;
	readonly kind: CoreKind;
}

const NO_SOURCE: ConsentSource = {
	enableFake: () => {
		// Replaced by the provider below.
	},
	fake: null,
	kind: 'native',
	nativeError: null,
	restart: () => {
		// Replaced by the provider below.
	},
};

const ConsentSourceContext = createContext<ConsentSource>(NO_SOURCE);

/** Read the running core, for the fixture chrome rather than consent itself. */
export const useConsentSource = (): ConsentSource =>
	useContext(ConsentSourceContext);

/** Whether the binary carries the c15t TurboModule. */
const probeNative = (): { client: ConsentClient } | { error: Error } => {
	try {
		const nativeModule = getNativeC15t();

		if (!hasNativeC15tSurface(nativeModule)) {
			return {
				error: new Error(
					'The C15t module is registered but incomplete, so the native build does not match this JavaScript package.'
				),
			};
		}

		return { client: getConsentClient() };
	} catch (error: unknown) {
		return {
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
};

/**
 * Attach the app to one consent core.
 *
 * @param props - Children plus the initial mode.
 * @param props.children - The app.
 * @param props.initialFake - Start on the fake core.
 * @returns The app, with consent available.
 */
export const ConsentSourceProvider = ({
	children,
	initialFake = config.forceFakeNative,
}: {
	readonly children: ReactNode;
	readonly initialFake?: boolean;
}): ReactNode => {
	// The probe is a build fact, not a transient failure: a binary without the
	// module will not grow one between renders, so it is taken once per mode.
	const probe = useMemo(
		() => (initialFake ? null : probeNative()),
		[initialFake]
	);
	const [fakeSession, setFakeSession] = useState<FakeNativeSession | null>(
		() => (probe === null || 'error' in probe ? fakeNativeSdk.start() : null)
	);

	const nativeClient =
		probe !== null && 'client' in probe ? probe.client : null;
	const nativeError = probe !== null && 'error' in probe ? probe.error : null;

	const fakeClient = useMemo(
		() =>
			fakeSession === null
				? null
				: createConsentClient(fakeSession.module, fakeSession.events),
		[fakeSession]
	);

	// The fake core owns intervals, so a leaving app has to take them with it.
	useEffect(
		() => () => {
			fakeSession?.core.dispose();
		},
		[fakeSession]
	);

	const [acknowledged, setAcknowledged] = useState(false);

	const startFake = useCallback(() => {
		setAcknowledged(true);
		setFakeSession((previous) => {
			previous?.core.dispose();
			return previous === null
				? fakeNativeSdk.start()
				: fakeNativeSdk.restart();
		});
	}, []);

	const source = useMemo<ConsentSource>(
		() => ({
			enableFake: startFake,
			fake: fakeSession === null ? null : fakeNativeSdk,
			kind: fakeSession === null ? 'native' : 'fake',
			// The fake core starts on its own when the module is missing, but the
			// build problem stays on screen until someone acknowledges it.
			nativeError: acknowledged ? null : nativeError,
			restart: startFake,
		}),
		[acknowledged, fakeSession, nativeError, startFake]
	);

	const usingNative = fakeSession === null && nativeClient !== null;

	return (
		<ConsentSourceContext.Provider value={source}>
			{usingNative ? (
				// The provider is the documented entry point and the one that runs
				// the protocol handshake, so the native path goes through it.
				<C15tProvider>{children}</C15tProvider>
			) : (
				// A new key is a new subtree, which is what a relaunch does to the
				// JavaScript side: every subscriber attaches to the new core.
				<ConsentClientContext.Provider
					key={fakeSession?.id ?? 0}
					value={fakeClient}
				>
					{children}
				</ConsentClientContext.Provider>
			)}
		</ConsentSourceContext.Provider>
	);
};
