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

	/**
	 * The `x-c15t-vendors` header name: the publisher's declared vendor scope.
	 *
	 * A scope declaration, not a filter this client relies on. It is the mobile spelling of the
	 * `vendorIds` parameter that `gvlRequestUrl` in `packages/backend/src/http/gvl.ts` puts on the
	 * upstream GVL request, which is why it travels as a header: `/init` is a GET this core builds
	 * from the project URL, and a client that invented query parameters on a route it does not own
	 * would break every deployment behind a proxy. A header rather than a body field for the same
	 * reason as the country and region overrides beside it -- the producer has to read it before it
	 * decides what to build, and `/init` has no body to put it in.
	 *
	 * A hint about bytes, never the answer about disclosure. A producer that honours it sends a list
	 * that needs no pruning; one that ignores it sends the wide one, and
	 * [com.c15t.core.NativeConfig.vendors] prunes it on the way into state. That is why an over-cap
	 * declaration sends no header and still gets a narrow device.
	 *
	 * The name is shared wire vocabulary: a producer reads the same header from a device, and the
	 * server half of it is specified by the same name and the same cap recorded on
	 * [MAX_VENDOR_SCOPE_HEADER_IDS].
	 */
	const val VENDOR_SCOPE_HEADER = "x-c15t-vendors"

	/**
	 * How many declared ids this build will still put on one request line.
	 *
	 * The same ceiling as `MAX_GVL_QUERY_VENDOR_IDS` in `packages/iab/src/tcf/fetch-gvl.ts` and in
	 * `packages/backend/src/http/gvl.ts`, for the same reason: past it the scope stops fitting
	 * comfortably in a request line, the producer is expected to fetch the list whole, and every
	 * consumer narrows locally. Both web functions keep that local prune above the cap, so the web
	 * answer for a 609-id publisher is "ask for everything, show your own partners", and this must
	 * not be the build that silently truncates a header into a different scope.
	 */
	const val MAX_VENDOR_SCOPE_HEADER_IDS = 500

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

	/**
	 * The `x-c15t-vendors` value for a declared scope, or `null` for no header.
	 *
	 * Deduplicated and ascending, so two hosts who declared the same partners in a
	 * different order, or twice in the same list, ask the same question of the backend.
	 * That stability is what makes the value cacheable and comparable on the producer side,
	 * which is exactly what the `vendorIds` parameter is keyed on upstream --
	 * `fetch-gvl.ts` sorts before it builds its cache key.
	 *
	 * Absent for the cases where a scope would be a lie or a burden: `null` and an empty
	 * list both mean no declaration, and above [MAX_VENDOR_SCOPE_HEADER_IDS] the scope
	 * cannot travel on the request line. In all of those the served list is whatever the
	 * producer chooses, and the local prune is what answers for it.
	 *
	 * @param vendorIds the declared ids, in whatever order the host wrote them.
	 * @return the ids as `1,2,3`, or `null` when no header should be sent.
	 */
	fun vendorScopeHeaderValue(vendorIds: List<Int>?): String? {
		if (vendorIds.isNullOrEmpty()) {
			return null
		}
		if (vendorIds.size > MAX_VENDOR_SCOPE_HEADER_IDS) {
			return null
		}
		val ids = vendorIds.distinct().sorted()
		if (ids.isEmpty()) {
			return null
		}
		return ids.joinToString(",")
	}

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
