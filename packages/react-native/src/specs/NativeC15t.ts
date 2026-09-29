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
 * result with the exported protocol types.
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
	/**
	 * Wipe consent and return the device to the state a first launch is in.
	 *
	 * The choice prompt is owed again afterwards, so the banner or dialog comes
	 * back: this is a withdrawal, not a recorded reject-everything. The c15t
	 * subject id is kept, because the backend holds an audit history keyed to it.
	 * Overrides, privacy-signal overrides, and the configured category scope are
	 * kept too, since those are configuration rather than consent.
	 *
	 * Resolves once the local state is durable, and then re-resolves the policy in
	 * the background the way a first launch does. It deliberately does not wait on
	 * a consent save that was already on its way when the wipe landed: the native
	 * core cannot recall a request it has handed to the transport, and the outcome
	 * is not something a caller can act on. Anything still queued goes with the
	 * queue, because those bodies carry a decision the subject just withdrew.
	 */
	reset: () => Promise<void>;
	/**
	 * Platform tracking authorization as a JSON-encoded
	 * `TrackingAuthorizationPayload`.
	 *
	 * Synchronous: it reads a state the OS already holds and touches no disk and
	 * no network. It is never an answer about consent, and it reports
	 * `unsupported` where the platform has no tracking gate for this build to
	 * satisfy: on Android always, and on iOS when the build carries no
	 * `NSUserTrackingUsageDescription`. It requests nothing.
	 */
	getTrackingAuthorization: () => string;
	/**
	 * Ask the platform for tracking authorization, resolving with a JSON-encoded
	 * `TrackingAuthorizationPayload`.
	 *
	 * Never called by this package. A host calls it, after its own consent UI, so
	 * the platform prompt is never the first thing a subject reads. On iOS it
	 * rejects when the build carries no `NSUserTrackingUsageDescription`, because
	 * Apple then suppresses the dialog and reports the answer back as denied
	 * without saying why; on Android it rejects because there is nothing to ask.
	 */
	requestTrackingAuthorization: () => Promise<string>;
	/** Register interest in an event; required by the event-emitter spec. */
	addListener: (eventName: string) => void;
	/** Report the number of live listeners; required by the emitter spec. */
	removeListeners: (count: number) => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('C15t');
