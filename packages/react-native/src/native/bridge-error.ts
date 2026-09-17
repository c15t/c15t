/**
 * The error for a native payload that cannot be read at all.
 */

/**
 * Thrown when a native payload cannot be read.
 *
 * A bootstrap that will not parse is a build error worth hearing about, so it
 * throws. A snapshot that will not parse does not throw: it fails closed
 * instead, because a snapshot read happens during render.
 */
export class NativeBridgeError extends Error {
	/**
	 * @param message - What could not be read, and from which call.
	 */
	public constructor(message: string) {
		super(message);
		this.name = 'NativeBridgeError';
	}
}
