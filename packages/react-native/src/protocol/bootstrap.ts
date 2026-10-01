/**
 * What the native core hands the JavaScript layer once, at provider mount.
 *
 * `getBootstrap()` is synchronous and cheap: it reads state the core already
 * holds after `bootstrap(config)` ran from a launch hook. It is the handshake
 * point, which is why the protocol range lives here rather than on the
 * snapshot.
 */

/**
 * Payload returned by `getBootstrap()`.
 */
export interface BootstrapPayload {
	/** Protocol the embedded native build speaks. */
	readonly protocolVersion: number;
	/** Oldest protocol the native build itself accepts. */
	readonly minSupportedProtocolVersion: number;
	/** Newest protocol the native build itself accepts. */
	readonly maxSupportedProtocolVersion: number;
	/**
	 * Native SDK version, which the core sends as the `x-c15t-version`
	 * request header prefixed `rn->`.
	 */
	readonly nativeSdkVersion: string;
	/**
	 * Subject id the core generated or loaded, or `null` before the first
	 * write. It is a c15t-generated UUID, never a hardware identifier.
	 */
	readonly subjectId: string | null;
	/**
	 * `true` when a stored envelope was found, so a cold start with no
	 * connectivity still answers `getSnapshot()` immediately.
	 */
	readonly hasStoredSnapshot: boolean;
}
