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
 * [id] is the c15t-owned id minted at first launch by `SubjectIdGenerator`, in the
 * `sub_` format the backend's `subjectIdSchema` accepts. An install that predates
 * that format keeps the UUID it stored: the id is an identifier, and a stored one is
 * never rewritten. It is never derived from IDFV, ADID, or any other hardware
 * identifier.
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
 * [gpc] is the app's override, not a detection. It is load bearing: `@c15t/core`
 * compares it against the decision inputs remembered from the last init and
 * rejects a save whose inputs no longer match, so a save body without it cannot
 * pass the backend's staleness check. Detection lives on [PrivacySignals.gpc].
 *
 * Publisher test mode is a client option rather than an override and never
 * reaches a save body, so it has no member here. The first draft of
 * `native/CONTRACT.md` invented a `test` field; [com.c15t.core.store.C15tStore]
 * refuses an envelope that still carries one rather than guessing at it.
 */
@Serializable
data class KernelOverrides(
	val country: String? = null,
	val region: String? = null,
	val language: String? = null,
	val gpc: Boolean? = null,
)

/**
 * The `gpc` member of [PrivacySignals]: the Global Privacy Control signal in the
 * three parts the kernel keeps apart.
 *
 * An evaluator reads [active]. [detected] and [override] exist so a host can tell
 * why a signal is on, and so a write is not treated as stale just because a
 * device started reporting GPC on its own.
 *
 * [active] is an output, never an input. A plain `copy` would let a caller set
 * `active: true` beside `detected: false` and no override, which is a signal the
 * two inputs do not support, so [withDetection] and [withOverride] are the only
 * ways to change one. The kernel recomputes it on every read rather than trusting
 * a stored copy, so an envelope that claims a signal is on while saying nothing
 * detected it and nothing overrode it is answered with the value the other two
 * support.
 */
@Serializable
data class GpcSignal(
	val detected: Boolean = false,
	val override: Boolean? = null,
	val active: Boolean = false,
) {
	/** Re-derive `active` from [override], keeping the reported detection. */
	fun withOverride(override: Boolean?): GpcSignal = derive(override = override, detected = detected)

	/** Re-derive `active` from [detected], keeping the app's override if any. */
	fun withDetection(detected: Boolean): GpcSignal = derive(override = override, detected = detected)

	companion object {
		/** Derive the view the way `derivePrivacySignals` in `@c15t/core` does. */
		fun derive(override: Boolean?, detected: Boolean): GpcSignal = GpcSignal(
			detected = detected,
			override = override,
			active = override ?: detected,
		)
	}
}

/**
 * Privacy signals the core honors, mirroring `KernelPrivacySignals`.
 *
 * There is no `msa` signal anywhere in v3. The first draft of
 * `native/CONTRACT.md` carried one beside a boolean `gpc`; both are refused when
 * a stored envelope is read.
 */
@Serializable
data class PrivacySignals(
	val gpc: GpcSignal = GpcSignal.derive(override = null, detected = false),
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
