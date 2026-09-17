package com.c15t.core.transport

/**
 * Header contract shared with `@c15t/core`.
 *
 * See `packages/core/src/transports/version-header.ts`. `x-c15t-version` is
 * telemetry only. `x-c15t-policy-contract` is the capability declaration: a
 * producer that speaks a different contract answers `unsupported-contract`
 * rather than a wire this build would misread.
 */
object C15tProtocol {
	const val VERSION_HEADER = "x-c15t-version"

	const val POLICY_CONTRACT_HEADER = "x-c15t-policy-contract"

	/** Must stay equal to `POLICY_CONTRACT_VERSION` in `@c15t/schema`. */
	const val POLICY_CONTRACT_VERSION = 1

	/**
	 * Platform tag the shared contract puts in front of the native SDK version,
	 * so backend traffic attributes to the mobile client rather than a web one.
	 */
	const val VERSION_PREFIX = "rn->"

	/** Default SDK version, kept in step with the `@c15t/core` alpha line. */
	const val DEFAULT_SDK_VERSION = "3.0.0-alpha.1"

	/** Headers every c15t-bound request carries. */
	fun protocolHeaders(sdkVersion: String = DEFAULT_SDK_VERSION): Map<String, String> = mapOf(
		VERSION_HEADER to "$VERSION_PREFIX$sdkVersion",
		POLICY_CONTRACT_HEADER to POLICY_CONTRACT_VERSION.toString(),
	)

}

/**
 * What the producer said about the policy contract it speaks.
 *
 * The three cases are not interchangeable, so they stay three cases:
 * `@c15t/core` reads the same distinction as `number | null | undefined`.
 * A producer that claims a contract this client cannot even parse is worse than
 * one that claims none, and both differ from a producer that predates the header.
 */
sealed class ProducerContract {
	/** No header: a producer that predates the contract. */
	data object NotDeclared : ProducerContract()

	/** A header that is not a plain integer: the claim is unreadable. */
	data object Unreadable : ProducerContract()

	/** A versioned claim, which may or may not be one this build speaks. */
	data class Declared(val version: Int) : ProducerContract()

	companion object {
		/** Read [C15tProtocol.POLICY_CONTRACT_HEADER] out of a response. */
		fun fromHeader(headerValue: String?): ProducerContract {
			val trimmed = headerValue?.trim() ?: return NotDeclared
			if (trimmed.isEmpty()) {
				return NotDeclared
			}
			val version = trimmed.toIntOrNull() ?: return Unreadable
			return Declared(version)
		}
	}
}
