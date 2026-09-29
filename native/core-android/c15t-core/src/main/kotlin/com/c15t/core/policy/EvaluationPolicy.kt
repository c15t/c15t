package com.c15t.core.policy

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentModel
import kotlinx.serialization.Serializable

/** The prompt a policy asks for. */
@Serializable
enum class PolicyPrompt(val wireName: String) {
	CHOICE("choice"),
	NOTICE("notice"),
	NONE("none"),
	;

	companion object {
		/** Parse a wire value, returning `null` for unknown values. */
		fun fromWireName(value: String?): PolicyPrompt? = entries.firstOrNull { it.wireName == value }
	}
}

/** How categories outside the policy scope behave. */
@Serializable
enum class ScopeMode(val wireName: String) {
	STRICT("strict"),
	PERMISSIVE("permissive"),
	;

	companion object {
		/** Parse a wire value, returning `null` for unknown values. */
		fun fromWireName(value: String?): ScopeMode? = entries.firstOrNull { it.wireName == value }
	}
}

/**
 * The validated policy projection the evaluator consumes.
 *
 * This is the mobile counterpart of `EvaluationPolicy` in
 * `packages/core/src/consent-record/types.ts`: the rule already normalized, with
 * wildcards expanded and the fingerprints kept so a stored choice can be checked
 * against the policy it was made under.
 *
 * It lives in the stored envelope rather than on [com.c15t.core.model.ConsentSnapshot],
 * which keeps the snapshot JSON exactly the shape the shared contract specifies
 * for the React Native boundary.
 */
@Serializable
data class EvaluationPolicy(
	val id: String,
	val model: ConsentModel,
	val prompt: PolicyPrompt,
	/** Optional categories the policy governs, in canonical order. */
	val scope: List<ConsentCategory>,
	val scopeMode: ScopeMode,
	/** Choice receipt validity window in milliseconds. */
	val choiceMs: Long,
	/** Notice dismissal validity window in milliseconds. */
	val noticeMs: Long,
	/** Categories an active GPC signal denies. Empty means the signal is ignored. */
	val gpcDenyCategories: List<ConsentCategory> = emptyList(),
	/** Choice-prompt fingerprint the choice receipt binds to. */
	val choiceFingerprint: String,
	/** Exact-behavior fingerprint of the rule. */
	val policyFingerprint: String,
	/**
	 * Notice-prompt fingerprint a notice dismissal binds to.
	 *
	 * `policyFingerprints.notice` on the wire, and not the choice one: the two cover
	 * different surfaces, so a dismissal the web SDK recorded against the notice has to
	 * be recognised here or the banner comes back for a subject who dismissed it. The
	 * default is not a guess at a missing field -- this lives in the stored envelope,
	 * which carries no format version, and refusing an envelope costs a device its whole
	 * consent state. An envelope written before this key existed therefore keeps the
	 * answer it used to give until the next `/init` serves the real one.
	 */
	val noticeFingerprint: String = choiceFingerprint,
) {
	/**
	 * The categories the choice prompt asks about, in canonical order.
	 *
	 * `projectChoiceScope` in `packages/core/src/policy.ts`. A declaration narrows
	 * [scope]. With nothing declared, a permissive rule asks about none of them,
	 * since categories outside the choice scope stay allowed there, and a strict
	 * rule asks about its whole scope, since nothing outside it may run. An IAB
	 * rule also asks about its whole scope: TCF consent is given per purpose and
	 * recorded in the TC string, whatever the app declares. The declaration is
	 * counted whole, `necessary` included, the way the kernel counts it.
	 *
	 * @param declared the categories the host declares, `null` or empty for none.
	 */
	fun choiceScope(declared: Collection<ConsentCategory>?): List<ConsentCategory> = when {
		!declared.isNullOrEmpty() -> scope.filter { it in declared }
		scopeMode == ScopeMode.PERMISSIVE && model != ConsentModel.IAB -> emptyList()
		else -> scope
	}
}
