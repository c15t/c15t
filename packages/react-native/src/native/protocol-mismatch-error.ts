/**
 * The error for a native build that speaks a protocol this bundle cannot use.
 */

import { describeProtocolMismatch } from '../protocol';

/**
 * Thrown when the embedded native build speaks a protocol this bundle cannot
 * use.
 *
 * The realistic trigger is a JavaScript-only update (Expo Updates, CodePush)
 * that shipped against a different binary, which is why the check compares a
 * range rather than a single number.
 */
export class C15tProtocolMismatchError extends Error {
	/**
	 * Version the native build reported, or `null` when it reported none.
	 */
	public readonly protocolVersion: number | null;

	/**
	 * @param protocolVersion - Version reported by `getBootstrap()`.
	 */
	public constructor(protocolVersion: number | null) {
		super(
			protocolVersion === null
				? '@c15t/react-native cannot use this native build: getBootstrap() reported no protocolVersion, so it predates the protocol this package speaks. Rebuild the app so the embedded native code matches the installed @c15t/react-native.'
				: describeProtocolMismatch(protocolVersion)
		);
		this.name = 'C15tProtocolMismatchError';
		this.protocolVersion = protocolVersion;
	}
}
