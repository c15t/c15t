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
)
