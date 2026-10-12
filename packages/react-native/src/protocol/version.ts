/**
 * Protocol handshake between the JavaScript layer and the embedded native
 * cores.
 *
 * The native side reports the protocol it was built against from
 * `getBootstrap()`. A JavaScript-only update (Expo Updates, CodePush) can
 * ship a bundle that speaks a newer protocol than the binary in the user's
 * hand, so the supported range, not a single number, is the contract.
 */

/**
 * Protocol version this JavaScript package speaks.
 *
 * Bump it only for a breaking change to the snapshot shape, the TurboModule
 * surface, or the meaning of a stored field. Additive fields do not bump it.
 */
export const PROTOCOL_VERSION = 1;

/**
 * Oldest native protocol this JavaScript package still supports.
 *
 * Version 1 is the only shipped protocol today. Raise this when a native
 * release drops support for an older snapshot shape.
 */
export const MIN_SUPPORTED_PROTOCOL_VERSION = 1;

/**
 * Newest native protocol this JavaScript package supports.
 *
 * A native build ahead of this value may send fields this bundle cannot
 * read, so it is rejected rather than trusted.
 */
export const MAX_SUPPORTED_PROTOCOL_VERSION = PROTOCOL_VERSION;

/**
 * Whether a native protocol version falls inside the supported range.
 *
 * Non-integer and non-finite values are unsupported: a native core that
 * cannot report a clean version is a configuration error, not a negotiation.
 *
 * @param protocolVersion - Version reported by the native core.
 * @returns `true` when this bundle can talk to that native build.
 */
export const isProtocolVersionSupported = function isProtocolVersionSupported(
	protocolVersion: number
): boolean {
	return (
		Number.isInteger(protocolVersion) &&
		protocolVersion >= MIN_SUPPORTED_PROTOCOL_VERSION &&
		protocolVersion <= MAX_SUPPORTED_PROTOCOL_VERSION
	);
};

/**
 * Readable mismatch message for the provider's handshake guard.
 *
 * @param protocolVersion - Version reported by the native core.
 * @returns Message naming both sides of the mismatch and the fix.
 */
export const describeProtocolMismatch = function describeProtocolMismatch(
	protocolVersion: number
): string {
	return (
		`@c15t/react-native cannot use this native build: it speaks consent ` +
		`protocol ${String(protocolVersion)}, while the installed JavaScript ` +
		`package supports ${String(MIN_SUPPORTED_PROTOCOL_VERSION)} to ${String(
			MAX_SUPPORTED_PROTOCOL_VERSION
		)}. Rebuild the app so the embedded native code matches this package, or ` +
		`install the @c15t/react-native version that shipped with the binary.`
	);
};
