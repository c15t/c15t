package com.c15t.core.transport

import com.c15t.core.model.ConsentLocation
import com.c15t.core.model.KernelError
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.PolicyResolution
import com.c15t.core.model.PrivacySignals
import com.c15t.core.policy.EvaluationPolicy
import com.c15t.core.policy.PolicyRead
import com.c15t.core.policy.StrictPolicyReader
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

/**
 * What an `/init` response contributes to the snapshot.
 *
 * [policyPending] is decided here rather than by the caller: a definitive answer
 * (`matched`, `no-match`, `unconfigured`) clears it, while any failure leaves it
 * set so the gate keeps denying every optional category.
 */
data class MappedInit(
	val resolution: PolicyResolution,
	val evaluationPolicy: EvaluationPolicy?,
	val policyPending: Boolean,
	val subjectId: String? = null,
	val location: ConsentLocation? = null,
	val resolvedOverrides: KernelOverrides? = null,
	val resolvedPrivacySignals: PrivacySignals? = null,
	val policySnapshotToken: String? = null,
	val translations: JsonObject? = null,
	val error: KernelError? = null,
)

/**
 * Reads an `/init` response the way `mapInitOutputToInitResponse` in
 * `packages/core/src/transports/init-output.ts` does.
 *
 * The order matters. A producer that declares a contract this build does not
 * speak, or declares one it cannot parse, fails before the body is read at all:
 * a body under an unknown contract is not evidence.
 */
object InitMapper {
	/** Map [outcome], never throwing; every unparseable path yields a failure. */
	fun map(outcome: TransportOutcome): MappedInit = when (outcome) {
		is TransportOutcome.HttpFailure -> MappedInit(
			resolution = PolicyResolution.failed(PolicyResolution.REASON_TRANSPORT),
			evaluationPolicy = null,
			policyPending = true,
			error = KernelError(
				code = PolicyResolution.REASON_TRANSPORT,
				message = "c15t: /init responded ${outcome.status}",
			),
		)

		is TransportOutcome.NetworkFailure -> MappedInit(
			resolution = PolicyResolution.failed(PolicyResolution.REASON_TRANSPORT),
			evaluationPolicy = null,
			policyPending = true,
			error = KernelError(code = PolicyResolution.REASON_TRANSPORT, message = outcome.message),
		)

		is TransportOutcome.Success -> mapSuccess(outcome)
	}

	private fun mapSuccess(outcome: TransportOutcome.Success): MappedInit {
		val declaration = ProducerContract.fromHeader(outcome.header(C15tProtocol.POLICY_CONTRACT_HEADER))
		val body = (outcome.body as? JsonObject)

		val rawResolution = body?.get("policyResolution")
		val read = StrictPolicyReader.read(rawResolution, declaration)

		val (resolution, policy) = when (read) {
			is PolicyRead.Matched -> PolicyResolution(
				status = PolicyResolution.STATUS_MATCHED,
				policyId = read.policy.id,
				fingerprint = read.policy.policyFingerprint,
			) to read.policy

			is PolicyRead.NoPolicy -> PolicyResolution(status = read.status) to null
			is PolicyRead.Failed -> PolicyResolution.failed(read.reason) to null
		}

		val error = if (resolution.status == PolicyResolution.STATUS_FAILED) {
			KernelError(
				code = resolution.reason ?: PolicyResolution.REASON_INVALID_PAYLOAD,
				message = initFailureMessage(resolution.reason, outcome),
			)
		} else {
			null
		}

		return MappedInit(
			resolution = resolution,
			evaluationPolicy = policy,
			policyPending = resolution.status == PolicyResolution.STATUS_FAILED,
			subjectId = body.stringOrNull("subjectId"),
			location = (body?.get("location") as? JsonObject)?.let { location ->
				ConsentLocation(
					country = location.stringOrNull("countryCode") ?: location.stringOrNull("country"),
					region = location.stringOrNull("regionCode") ?: location.stringOrNull("region"),
					language = location.stringOrNull("language"),
				)
			},
			resolvedOverrides = (body?.get("resolvedOverrides") as? JsonObject)?.let { overrides ->
				KernelOverrides(
					country = overrides.stringOrNull("country"),
					region = overrides.stringOrNull("region"),
					language = overrides.stringOrNull("language"),
					test = overrides["gpc"]?.let { (it as? JsonPrimitive)?.contentOrNull?.toBooleanStrictOrNull() },
				)
			},
			resolvedPrivacySignals = (body?.get("resolvedPrivacySignals") as? JsonObject)?.let { signals ->
				PrivacySignals(
					gpc = signals["gpc"]?.let { (it as? JsonPrimitive)?.contentOrNull?.toBooleanStrictOrNull() } ?: false,
					msa = signals["msa"]?.let { (it as? JsonPrimitive)?.contentOrNull?.toBooleanStrictOrNull() } ?: false,
				)
			},
			policySnapshotToken = body.stringOrNull("policySnapshotToken"),
			translations = body?.get("translations") as? JsonObject,
			error = error,
		)
	}

	/**
	 * An unsupported contract is a configuration error, not a transient one, so
	 * the message says what to change.
	 */
	private fun initFailureMessage(
		reason: String?,
		outcome: TransportOutcome.Success,
	): String = when (reason) {
		PolicyResolution.REASON_UNSUPPORTED_CONTRACT -> {
			val declared = outcome.header(C15tProtocol.POLICY_CONTRACT_HEADER) ?: "<absent>"
			"c15t: backend declares policy contract $declared, this SDK reads " +
				C15tProtocol.POLICY_CONTRACT_VERSION +
				". Consent stays deny-all until the backend or the SDK is updated."
		}

		PolicyResolution.REASON_INVALID_PAYLOAD -> "c15t: /init returned a policy resolution this SDK cannot represent; consent stays deny-all"
		else -> "c15t: /init policy resolution failed ($reason); consent stays deny-all"
	}

	private fun JsonObject?.stringOrNull(key: String): String? {
		val value = this?.get(key) as? JsonPrimitive ?: return null
		return value.contentOrNull?.takeIf { it.isNotEmpty() }
	}
}
