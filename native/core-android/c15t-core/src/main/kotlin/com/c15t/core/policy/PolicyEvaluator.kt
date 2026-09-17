package com.c15t.core.policy

import com.c15t.core.model.ActiveUI
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentModel
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentState
import com.c15t.core.model.PromptPurpose
import com.c15t.core.model.PromptRequirement

/**
 * Turns a stored choice plus a validated policy into effective permissions.
 *
 * Every path in here is deny-by-default: an unset flag, an expired receipt, or a
 * missing rule all end in the same all-optional-denied state the contract calls
 * for. Nothing is inferred in the permissive direction.
 */
object PolicyEvaluator {
	/** Restriction reason for a category the policy governs outside its scope. */
	const val RESTRICTION_STRICT_SCOPE = "strict-scope"

	/** Restriction reason for a category denied by an active GPC signal. */
	const val RESTRICTION_GPC = "gpc"

	/** Restriction reason for a standing opt-out directive. */
	const val RESTRICTION_DIRECTIVE = "opt-out-directive"

	/**
	 * Evaluate [snapshot] against [policy] at [now] and return a snapshot with
	 * [ConsentSnapshot.effectivePermissions], [ConsentSnapshot.promptRequirement],
	 * [ConsentSnapshot.activeUI], [ConsentSnapshot.restrictions],
	 * [ConsentSnapshot.model] and [ConsentSnapshot.nextDeadline] rebuilt.
	 *
	 * @param policy the validated rule, or `null` for a non-matched resolution,
	 * which uses the safe opt-in fallback.
	 * @param noticeDismissal the local notice dismissal, if any.
	 */
	fun evaluate(
		snapshot: ConsentSnapshot,
		policy: EvaluationPolicy?,
		noticeDismissal: NoticeDismissal?,
		now: Long,
	): ConsentSnapshot {
		// The two flags a native gate must consult. While either is unset the
		// first layer stays hidden and no optional category can read true.
		if (snapshot.policyPending) {
			return snapshot.copy(
				model = ConsentModel.OPT_IN,
				activeUI = ActiveUI.NONE,
				promptRequirement = PromptRequirement.NONE,
				effectivePermissions = ConsentState.DENY_ALL,
				restrictions = emptyMap(),
				nextDeadline = null,
				evaluatedAt = now,
			)
		}

		if (policy == null) {
			// No-match, unconfigured, or a failed resolution: the safe opt-in
			// fallback denies every optional category until an explicit grant, and
			// shows nothing because there is no policy to prompt for.
			return snapshot.copy(
				model = ConsentModel.OPT_IN,
				activeUI = ActiveUI.NONE,
				promptRequirement = PromptRequirement.NONE,
				effectivePermissions = ConsentState.DENY_ALL,
				restrictions = emptyMap(),
				nextDeadline = null,
				evaluatedAt = now,
			)
		}

		val choice = snapshot.explicitChoice
		val choiceCurrent = choice != null &&
			choice.matchesFingerprint(policy.choiceFingerprint) &&
			now - choice.actionAt <= policy.choiceMs

		val gpcActive = snapshot.overrides.test == true || snapshot.privacySignals.gpc
		val directiveCategories = if (gpcActive) {
			snapshot.optOutDirectives
				.filter { it.source == RESTRICTION_GPC }
				.flatMap { directive -> directive.categories.mapNotNull { ConsentCategory.fromWireName(it) } }
				.toSet()
		} else {
			emptySet()
		}

		val permissions = LinkedHashMap<ConsentCategory, Boolean>(ConsentCategory.OPTIONAL.size)
		val restrictions = LinkedHashMap<String, List<String>>()

		for (category in ConsentCategory.OPTIONAL) {
			val inScope = category in policy.scope
			var allowed: Boolean
			val reasons = mutableListOf<String>()

			if (inScope) {
				allowed = allowedByModel(policy.model, choice, category, choiceCurrent)
			} else if (policy.scopeMode == ScopeMode.STRICT) {
				// A strict scope withholds everything it does not name.
				allowed = false
				reasons += RESTRICTION_STRICT_SCOPE
			} else {
				// Permissive: the policy simply does not govern this category, so it
				// follows its model default without a prompt.
				allowed = policy.model != ConsentModel.OPT_IN || choice?.valueOf(category) == true
			}

			if (allowed && gpcActive && category in policy.gpcDenyCategories) {
				allowed = false
				reasons += RESTRICTION_GPC
			}
			if (allowed && category in directiveCategories) {
				allowed = false
				reasons += RESTRICTION_DIRECTIVE
			}

			permissions[category] = allowed
			if (reasons.isNotEmpty()) {
				restrictions[category.wireName] = reasons.toList()
			}
		}

		val noticeCurrent = noticeDismissal != null &&
			noticeDismissal.covers(policy.choiceFingerprint, now, policy.noticeMs)

		val owesChoice = policy.prompt == PolicyPrompt.CHOICE && !choiceCurrent
		// A current choice receipt covers the notice too, which is what lets
		// accepting close the first layer without a separate dismissal.
		val owesNotice = (policy.prompt == PolicyPrompt.CHOICE || policy.prompt == PolicyPrompt.NOTICE) &&
			!noticeCurrent &&
			!choiceCurrent

		val prompt = if (policy.prompt == PolicyPrompt.NONE) {
			PromptRequirement.NONE
		} else if (!owesChoice && !owesNotice) {
			PromptRequirement.NONE
		} else {
			PromptRequirement(
				notice = owesNotice,
				acknowledge = owesChoice,
				purpose = if (choice == null && noticeDismissal == null) PromptPurpose.INITIAL else PromptPurpose.UPDATE,
			)
		}

		// The next moment a receipt lapses and permissions or the prompt change.
		val nextDeadline = listOfNotNull(
			choice?.let { it.actionAt + policy.choiceMs }?.takeIf { choiceCurrent && it > now },
			noticeDismissal?.let { it.dismissedAt + policy.noticeMs }?.takeIf { noticeCurrent && it > now },
		).minOrNull()

		var state = ConsentState(necessary = true)
		for ((category, allowed) in permissions) {
			state = state.with(category, allowed)
		}

		return snapshot.copy(
			model = policy.model,
			activeUI = if (prompt.notice || prompt.acknowledge) ActiveUI.BANNER else ActiveUI.NONE,
			promptRequirement = prompt,
			effectivePermissions = state,
			restrictions = restrictions,
			nextDeadline = nextDeadline,
			evaluatedAt = now,
		)
	}

	/** The unmasked permission a model gives [category] before restrictions. */
	private fun allowedByModel(
		model: ConsentModel,
		choice: com.c15t.core.model.ExplicitChoice?,
		category: ConsentCategory,
		choiceCurrent: Boolean,
	): Boolean = when (model) {
		// Nothing is allowed until a current receipt says so.
		ConsentModel.OPT_IN -> choiceCurrent && choice?.valueOf(category) == true
		// Allowed until the subject says no; an expired choice restores the default.
		ConsentModel.OPT_OUT -> if (choiceCurrent) choice?.valueOf(category) != false else true
		// No prompt and no rights: processing is permitted by default.
		ConsentModel.NONE -> true
	}
}
