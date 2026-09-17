package com.c15t.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonNull

/**
 * Interaction the active policy still requires.
 *
 * `notice` is the first-layer prompt (banner), `acknowledge` the explicit
 * choice. `purpose` distinguishes a first prompt from a re-prompt caused by an
 * expired or changed policy.
 */
@Serializable
data class PromptRequirement(
	val notice: Boolean = false,
	val acknowledge: Boolean = false,
	val purpose: PromptPurpose? = null,
) {
	companion object {
		/** Nothing owed. */
		val NONE = PromptRequirement()
	}
}

/**
 * Policy resolution outcome carried on the snapshot.
 *
 * [status] is the raw wire status: `matched`, `no-match`, `unconfigured`, or
 * `failed`. [reason] is only present for `failed` and names why, mirroring
 * `PolicyResolutionFailure` in `@c15t/schema`.
 */
@Serializable
data class PolicyResolution(
	val status: String = STATUS_UNCONFIGURED,
	val policyId: String? = null,
	val fingerprint: String? = null,
	val reason: String? = null,
) {
	val matched: Boolean
		get() = status == STATUS_MATCHED

	companion object {
		const val STATUS_MATCHED = "matched"
		const val STATUS_NO_MATCH = "no-match"
		const val STATUS_UNCONFIGURED = "unconfigured"
		const val STATUS_FAILED = "failed"

		const val REASON_INVALID_CONFIGURATION = "invalid-configuration"
		const val REASON_INSUFFICIENT_INPUTS = "insufficient-inputs"
		const val REASON_TRANSPORT = "transport"
		const val REASON_UNSUPPORTED_CONTRACT = "unsupported-contract"
		const val REASON_INVALID_PAYLOAD = "invalid-payload"

		/** A `failed` resolution with [reason], carrying no policy. */
		fun failed(reason: String): PolicyResolution = PolicyResolution(
			status = STATUS_FAILED,
			reason = reason,
		)
	}
}

/**
 * Subject identifiers.
 *
 * [id] is the c15t-owned UUID v4 generated at first launch. It is never derived
 * from IDFV, ADID, or any other hardware identifier.
 */
@Serializable
data class ConsentSubject(
	val id: String,
	val externalId: String? = null,
)

/** Geographic context reported by the backend. */
@Serializable
data class ConsentLocation(
	val country: String? = null,
	val region: String? = null,
	val language: String? = null,
)

/**
 * Developer overrides that steer policy evaluation.
 *
 * [test] forces the GPC signal on regardless of what the device reports, which
 * is the mobile equivalent of the web SDK's `overrides.gpc`.
 */
@Serializable
data class KernelOverrides(
	val country: String? = null,
	val region: String? = null,
	val language: String? = null,
	val test: Boolean? = null,
)

/** Privacy signals the core knows about. */
@Serializable
data class PrivacySignals(
	val gpc: Boolean = false,
	val msa: Boolean = false,
)

/**
 * User identification attached to consent records. External id only: no PII
 * beyond what the integrator opts in to.
 */
@Serializable
data class KernelUser(
	val externalId: String,
	val identityProvider: String? = null,
	val properties: Map<String, String>? = null,
)

/**
 * Standing privacy directive recorded from a device signal. It is a privacy
 * request, not a consent record, and it outlives the live signal.
 */
@Serializable
data class OptOutDirective(
	val source: String,
	val categories: List<String> = emptyList(),
	val recordedAt: Long,
)

/** A failure the core wants the host to surface. */
@Serializable
data class KernelError(
	val code: String,
	val message: String,
)

/**
 * Explicit category choices, captured once per commit.
 *
 * [consents] holds the explicit value per optional category; absent keys are
 * undecided and the evaluator fills them from the policy default. [fingerprint]
 * is the choice-prompt fingerprint the choice was made against, so a policy
 * change invalidates it instead of silently reusing an old grant.
 */
@Serializable
data class ExplicitChoice(
	val consents: Map<String, Boolean>,
	val action: ConsentAction,
	val actionAt: Long,
	val fingerprint: String? = null,
	val version: Int = 3,
) {
	/** Read the explicit value for [category], `null` when undecided. */
	fun valueOf(category: ConsentCategory): Boolean? = consents[category.wireName]

	/** `true` when the choice was made against [currentFingerprint]. */
	fun matchesFingerprint(currentFingerprint: String?): Boolean {
		if (fingerprint == null || currentFingerprint == null) {
			return true
		}
		return fingerprint == currentFingerprint
	}
}

/** The categories one commit confirmed, with the single captured action time. */
@Serializable
data class ConfirmedCoverage(
	val categories: Map<String, Boolean>,
	/** Epoch milliseconds captured once, before any disk or network call. */
	val actionAt: Long,
)

/** Resolved policy inputs captured with an action, replayed unchanged on retry. */
@Serializable
data class DecisionInputs(
	val policyId: String? = null,
	val fingerprint: String? = null,
	val country: String? = null,
	val region: String? = null,
	val language: String? = null,
	val gpc: Boolean = false,
)

/**
 * The one immutable consent state the native core holds, versioned by
 * [revision].
 *
 * Field set and semantics follow `native/CONTRACT.md`, which is the mobile
 * projection of `ConsentSnapshot` in `packages/core/src/types.ts` minus IAB.
 * Every mutation produces a new instance and bumps [revision]; readers never see
 * a partially updated snapshot.
 */
@Serializable
data class ConsentSnapshot(
	/** Monotonic revision, bumps on every mutation. */
	val revision: Long = 0,
	/** `true` until the first init resolves a policy the core can represent. */
	val policyPending: Boolean = true,
	/** `false` until a stored snapshot was hydrated or an init resolved. */
	val ready: Boolean = false,
	val model: ConsentModel = ConsentModel.OPT_IN,
	val activeUI: ActiveUI? = ActiveUI.NONE,
	val promptRequirement: PromptRequirement = PromptRequirement.NONE,
	val effectivePermissions: ConsentState = ConsentState.DENY_ALL,
	val explicitChoice: ExplicitChoice? = null,
	/** Configured categories; `null` uses the full policy scope. */
	val consentCategories: List<String>? = null,
	/** Category name to restriction reasons, for explainability. */
	val restrictions: Map<String, List<String>> = emptyMap(),
	val resolution: PolicyResolution = PolicyResolution(),
	/** Signed token for write-time consistency, sent back on save. */
	val policySnapshotToken: String? = null,
	val subject: ConsentSubject? = null,
	val location: ConsentLocation? = null,
	val overrides: KernelOverrides = KernelOverrides(),
	val privacySignals: PrivacySignals = PrivacySignals(),
	val optOutDirectives: List<OptOutDirective> = emptyList(),
	/** Opaque translation bundle from `/init`, carried through untouched. */
	val translations: JsonObject? = null,
	/** Earliest future time (epoch ms) that can change permissions or the prompt. */
	val nextDeadline: Long? = null,
	/** Epoch milliseconds of the last evaluation. */
	val evaluatedAt: Long = 0,
	val error: KernelError? = null,
	/**
	 * Reserved IAB slot. Always `null` this phase; the key is kept so a
	 * JavaScript layer does not have to branch on the SDK version.
	 */
	@SerialName("iab")
	val iab: JsonElement = JsonNull,
) {
	/**
	 * Whether [category] may run right now.
	 *
	 * `necessary` is always granted. While [ready] or [policyPending] is unset
	 * every optional category reads `false`, which is the deny-all contract both
	 * flags guard.
	 */
	fun isAllowed(category: ConsentCategory): Boolean {
		if (!category.optional) {
			return true
		}
		if (!ready || policyPending) {
			return false
		}
		return effectivePermissions[category]
	}

	companion object {
		/** The snapshot a cold start with nothing stored answers with. */
		fun denyAll(subject: ConsentSubject? = null, now: Long = 0): ConsentSnapshot = ConsentSnapshot(
			policyPending = true,
			ready = false,
			effectivePermissions = ConsentState.DENY_ALL,
			subject = subject,
			evaluatedAt = now,
		)
	}
}
