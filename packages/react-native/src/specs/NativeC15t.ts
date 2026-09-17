/**
 * Codegen TurboModule spec for the c15t native consent cores.
 *
 * New Architecture only: no legacy bridge, no `NativeModules` lookup. The
 * build reads this file through the `codegenConfig` in `package.json` and
 * generates the Swift protocol and the Java/Kotlin interfaces, so the list
 * below is the whole surface for both platforms. The native side registers
 * the module under `C15t`, the string at the bottom of this file.
 *
 * Every structured payload crosses the bridge as a JSON string. Codegen
 * cannot express the unions in the snapshot or the commit intent, the
 * contract already requires event payloads to be JSON strings, and one
 * encoding keeps the Swift, Kotlin, and JavaScript reads identical. Parse the
 * result with the types in `src/protocol`.
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * The module surface the native cores implement.
 *
 * `getBootstrap` and `getSnapshot` are synchronous and must not touch the
 * network, the disk, or a lock held across either: ad SDKs call them on the
 * main thread. Everything that can wait returns a promise.
 */
export interface Spec extends TurboModule {
	/**
	 * Handshake payload as a JSON-encoded `BootstrapPayload`.
	 * Synchronous, read once per provider mount.
	 */
	getBootstrap: () => string;
	/**
	 * Current snapshot as a JSON-encoded `ConsentSnapshot`.
	 * Synchronous and non-blocking.
	 */
	getSnapshot: () => string;
	/**
	 * Apply a consent action, where `intent` is a JSON-encoded `CommitIntent`.
	 * Resolves with a JSON-encoded `CommitResult`.
	 */
	commit: (intent: string) => Promise<string>;
	/**
	 * Replace geographic, language, or test overrides, where `overrides` is a
	 * JSON-encoded `NativeOverridesInput`. Re-resolves the policy.
	 */
	setOverrides: (overrides: string) => Promise<void>;
	/**
	 * Record that the current notice was dismissed. Synchronous and local: it
	 * never writes to the backend.
	 */
	dismissNotice: () => void;
	/** Re-resolve policy, re-evaluate, and retry the offline queue. */
	refresh: () => Promise<void>;
	/**
	 * Attach an external id to the subject and reload the subject's stored
	 * record.
	 */
	identify: (externalId: string) => Promise<void>;
	/**
	 * Detach the external id. The c15t subject id is kept, so consent does not
	 * reset on sign-out.
	 */
	logout: () => Promise<void>;
	/** Register interest in an event; required by the event-emitter spec. */
	addListener: (eventName: string) => void;
	/** Report the number of live listeners; required by the emitter spec. */
	removeListeners: (count: number) => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('C15t');
