package com.c15t.core.policy

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentModel
import com.c15t.core.model.PolicyResolution
import com.c15t.core.transport.ProducerContract
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.longOrNull

/** Outcome of reading a `policyResolution` wire value. */
sealed class PolicyRead {
	/** A rule this build can represent. */
	data class Matched(val policy: EvaluationPolicy) : PolicyRead()

	/** A resolution the backend reported that asks for no policy. */
	data class NoPolicy(val status: String) : PolicyRead()

	/**
	 * Anything this build cannot represent. The caller serves the deny-all
	 * snapshot with [reason] recorded, which is contract rule 5.
	 */
	data class Failed(val reason: String) : PolicyRead()
}

/**
 * Strict reader for the `policyResolution` value of an `/init` response.
 *
 * The reader never repairs, defaults, or guesses a permission. It accepts the
 * normalized `ResolvedPolicyRule` shape from `@c15t/schema` and rejects
 * everything else, including the `iab` model, which this phase cannot represent.
 */
object StrictPolicyReader {
	/** Policy wire contract version this build reads; matches `@c15t/schema`. */
	const val POLICY_CONTRACT_VERSION = 1

	/** Categories the `'*'` wildcard expands to. */
	private val ALL_OPTIONAL = ConsentCategory.OPTIONAL

	/**
	 * Read [element], the raw `policyResolution` member of an `/init` body.
	 *
	 * @param element the raw wire value, or `null` when the member was absent.
	 * @param declaration what the producer claimed about its contract; anything
	 * this build does not speak fails before the body is read.
	 */
	fun read(
		element: JsonElement?,
		declaration: ProducerContract = ProducerContract.NotDeclared,
	): PolicyRead {
		// A body written under an unknown contract is not evidence, so this check
		// runs before any field is looked at.
		val negotiated = when (declaration) {
			is ProducerContract.Declared -> declaration.version == POLICY_CONTRACT_VERSION
			ProducerContract.Unreadable -> return PolicyRead.Failed(PolicyResolution.REASON_UNSUPPORTED_CONTRACT)
			ProducerContract.NotDeclared -> false
		}
		if (declaration is ProducerContract.Declared && !negotiated) {
			return PolicyRead.Failed(PolicyResolution.REASON_UNSUPPORTED_CONTRACT)
		}
		if (element == null || element is JsonNull) {
			return if (negotiated) {
				// A negotiated producer that sent no resolution broke the protocol.
				PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
			} else {
				PolicyRead.Failed(PolicyResolution.REASON_UNSUPPORTED_CONTRACT)
			}
		}
		val root = element as? JsonObject ?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)

		root.stringOrNull("version")?.let { declared ->
			// The body declares its own contract; honour it even when the response
			// header was missing.
			val version = declared.toLongOrNull() ?: return PolicyRead.Failed(PolicyResolution.REASON_UNSUPPORTED_CONTRACT)
			if (version != POLICY_CONTRACT_VERSION.toLong()) {
				return PolicyRead.Failed(PolicyResolution.REASON_UNSUPPORTED_CONTRACT)
			}
		}

		return when (val status = root.stringOrNull("status")) {
			PolicyResolution.STATUS_MATCHED -> readMatched(root)
			PolicyResolution.STATUS_NO_MATCH, PolicyResolution.STATUS_UNCONFIGURED -> PolicyRead.NoPolicy(status)
			PolicyResolution.STATUS_FAILED -> {
				val reason = root.stringOrNull("reason") ?: PolicyResolution.REASON_INVALID_PAYLOAD
				PolicyRead.Failed(reason)
			}

			null -> PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
			else -> PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
		}
	}

	private fun readMatched(root: JsonObject): PolicyRead {
		val policyId = root.stringOrNull("policyId") ?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
		val policy = root["policy"] as? JsonObject ?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
		val fingerprints = root["fingerprints"] as? JsonObject
		val choiceFingerprint = fingerprints.stringOrNull("choice") ?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
		val policyFingerprint = fingerprints.stringOrNull("policy") ?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
		// `policyFingerprintsSchema` in `@c15t/schema` requires all three; only
		// `legacyMaterial` is optional. A notice dismissal is judged against this one.
		val noticeFingerprint = fingerprints.stringOrNull("notice") ?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)

		val model = ConsentModel.fromWireName(policy.stringOrNull("model"))
			// `iab` and any future model are unrepresentable here.
			?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)

		val prompt = PolicyPrompt.fromWireName(policy.stringOrNull("prompt"))
			?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)

		// The wire key is `scope`; `categories` is a save-body field and never appears here.
		val scope = readCategories(policy["scope"], ALL_OPTIONAL)
			?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)

		val rawScopeMode = policy.stringOrNull("scopeMode")
		val scopeMode = when {
			rawScopeMode == null && (policy["scope"] == null || policy["scope"].isWildcard()) -> ScopeMode.PERMISSIVE
			rawScopeMode == null -> return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
			else -> ScopeMode.fromWireName(rawScopeMode) ?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
		}

		val validity = policy["validity"] as? JsonObject
			?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
		val choiceMs = readDurationMs(validity, "choiceMs", "choiceDays")
			?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)
		val noticeMs = readDurationMs(validity, "noticeMs", "noticeDays")
			?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)

		val gpcDeny = readCategories(
			(policy["privacySignals"] as? JsonObject)?.let { (it["gpc"] as? JsonObject)?.get("denyCategories") },
			emptyList(),
		)
			?: return PolicyRead.Failed(PolicyResolution.REASON_INVALID_PAYLOAD)

		return PolicyRead.Matched(
			EvaluationPolicy(
				id = policy.stringOrNull("id") ?: policyId,
				model = model,
				prompt = prompt,
				scope = scope,
				scopeMode = scopeMode,
				choiceMs = choiceMs,
				noticeMs = noticeMs,
				gpcDenyCategories = gpcDeny,
				choiceFingerprint = choiceFingerprint,
				policyFingerprint = policyFingerprint,
				noticeFingerprint = noticeFingerprint,
			)
		)
	}

	/**
	 * Read a category list. `null` means the member was absent, which callers
	 * decide about; a non-empty list containing an unknown name returns `null`
	 * too, because inventing a scope is exactly what rule 5 forbids.
	 */
	private fun readCategories(
		element: JsonElement?,
		absent: List<ConsentCategory>,
	): List<ConsentCategory>? {
		if (element == null || element is JsonNull) {
			return absent
		}
		val array = element as? JsonArray ?: return null
		if (array.isEmpty() || array.isWildcard()) {
			return absent
		}
		val out = ArrayList<ConsentCategory>(array.size)
		for (item in array) {
			val name = (item as? JsonPrimitive)?.contentOrNull ?: return null
			if (name == "necessary") {
				// Tolerated and dropped upstream.
				continue
			}
			val category = ConsentCategory.fromWireName(name)?.takeIf { it.optional } ?: return null
			out += category
		}
		return ALL_OPTIONAL.filter { it in out }
	}

	/** Read a millisecond duration, falling back to the day-based author form. */
	private fun readDurationMs(
		validity: JsonObject,
		millisKey: String,
		daysKey: String,
	): Long? {
		validity[millisKey]?.let { value ->
			val millis = (value as? JsonPrimitive)?.longOrNull ?: return@let
			if (millis <= 0L) {
				return null
			}
			return millis
		}
		val days = (validity[daysKey] as? JsonPrimitive)?.doubleOrNull ?: return null
		if (days <= 0.0 || days.isNaN() || days.isInfinite()) {
			return null
		}
		return Math.round(days * MILLIS_PER_DAY)
	}

	private fun JsonObject?.stringOrNull(key: String): String? {
		val value = this?.get(key) as? JsonPrimitive ?: return null
		return value.contentOrNull?.takeIf { it.isNotEmpty() }
	}

	private fun JsonElement?.isWildcard(): Boolean =
		this is JsonArray && size == 1 && (this[0] as? JsonPrimitive)?.contentOrNull == "*"

	private const val MILLIS_PER_DAY = 86_400_000L
}
