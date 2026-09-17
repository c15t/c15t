/**
 * Stand-in for the `react-native` module.
 *
 * The real entry point needs a React Native runtime, so this file is swapped in
 * through the `resolve.alias` entry in the package's Vitest config. It is a
 * faithful implementation of the surfaces the package touches, not a mock: the
 * production lookup path runs unchanged, and the state it records says which
 * module the registry handed back, how many emitters were built, and who is
 * listening to each event.
 *
 * The UI half — `View`, `Text`, `Pressable`, `Switch`, `Modal`, `Animated`, and
 * the platform hooks — lives in `./react-native-ui-stub` and re-exports from
 * here, so one alias covers the bridge and the components.
 */

import { resetUiStub } from './react-native-ui-stub';

export * from './react-native-ui-stub';

/** Modules the stubbed registry will return, keyed by registered name. */
export const nativeModuleRegistry = new Map<string, unknown>();

/** One registered native-event listener. */
type EventHandler = (payload: unknown) => void;

/**
 * Recorded state, so a test can assert on subscription counts instead of
 * guessing whether the bridge attached.
 */
export const emitterState: {
	/** How many emitters have been constructed. */
	instances: number;
	/** Live listeners per event name. */
	listeners: Map<string, Set<EventHandler>>;
	/** When true, `TurboModuleRegistry.get` invariants instead of returning null. */
	throws: boolean;
} = {
	instances: 0,
	listeners: new Map(),
	throws: false,
};

/**
 * Toggle the failing-registry mode.
 *
 * A build with the New Architecture disabled fails this way, so the bridge has
 * to turn it into its own error instead of letting it escape.
 *
 * @param value - `true` to make lookups throw.
 */
export const setRegistryThrows = function setRegistryThrows(
	value: boolean
): void {
	emitterState.throws = value;
};

/** The `TurboModuleRegistry` surface the bridge uses. */
export const TurboModuleRegistry = {
	get: (moduleName: string): unknown => {
		if (emitterState.throws) {
			throw new Error(
				'TurboModuleRegistry.get: TurboModuleRegistry is not supported on this platform.'
			);
		}

		return nativeModuleRegistry.get(moduleName) ?? null;
	},
	getEnforcing: (moduleName: string): unknown => {
		const candidate = nativeModuleRegistry.get(moduleName);

		if (candidate === undefined) {
			throw new Error(
				`TurboModuleRegistry.getEnforcing: '${moduleName}' could not be found.`
			);
		}

		return candidate;
	},
};

/**
 * The `NativeEventEmitter` surface the bridge uses.
 */
export class NativeEventEmitter {
	/** Shared bookkeeping, so every emitter reads and writes one registry. */
	private readonly state = emitterState;

	/**
	 * @param _nativeModule - Accepted and ignored, as the real class only keeps
	 * it for the iOS invariant check.
	 */
	public constructor(_nativeModule?: unknown) {
		this.state.instances += 1;
	}

	/**
	 * Register a listener for one event.
	 *
	 * @param eventName - Event name.
	 * @param handler - Listener.
	 * @returns A subscription with a `remove` method.
	 */
	public addListener(
		eventName: string,
		handler: EventHandler
	): { remove: () => void } {
		const handlers = this.state.listeners.get(eventName) ?? new Set();

		handlers.add(handler);
		this.state.listeners.set(eventName, handlers);

		return {
			remove: () => {
				handlers.delete(handler);
			},
		};
	}
}

/**
 * Register a native module for the tests.
 *
 * @param moduleName - Name the bridge looks the module up under.
 * @param nativeModule - The fake module, or `undefined` to simulate a missing
 * pod, Expo Go, or web.
 */
export const setNativeModule = function setNativeModule(
	moduleName: string,
	nativeModule?: unknown
): void {
	if (nativeModule === undefined) {
		nativeModuleRegistry.delete(moduleName);
		return;
	}

	nativeModuleRegistry.set(moduleName, nativeModule);
};

/**
 * Fire a native event the way the core does.
 *
 * @param eventName - One of the protocol event names.
 * @param payload - Payload to deliver.
 */
export const emitNativeEvent = function emitNativeEvent(
	eventName: string,
	payload: unknown
): void {
	for (const handler of [...(emitterState.listeners.get(eventName) ?? [])]) {
		handler(payload);
	}
};

/**
 * Count the listeners attached to one event.
 *
 * @param eventName - Event name.
 * @returns How many subscriptions are live.
 */
export const nativeListenerCount = function nativeListenerCount(
	eventName: string
): number {
	return emitterState.listeners.get(eventName)?.size ?? 0;
};

/** Drop every module and listener, and reset the emitter counter. */
export const resetNativeStub = function resetNativeStub(): void {
	nativeModuleRegistry.clear();
	emitterState.listeners.clear();
	emitterState.instances = 0;
	emitterState.throws = false;
	resetUiStub();
};
