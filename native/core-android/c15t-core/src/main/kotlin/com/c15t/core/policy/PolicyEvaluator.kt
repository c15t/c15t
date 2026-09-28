package com.c15t.core.policy

import com.c15t.core.model.ActiveUI
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentModel
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentState
import com.c15t.core.model.PromptPurpose
import com.c15t.core.model.PromptReason
import com.c15t.core.model.PromptRequirement

/**
 * Turns a stored choice plus a validated policy into effective permissions.
 *
 * Every path in here is deny-by-default: an unset flag, an expired receipt, or a
 * missing rule all end in the same all-optional-denied state the contract calls
 * for. Nothing is inferred in the permissive direction.
 */
object PolicyEvaluator {
	/** Restriction reason for a decision the subject recorded as `false`. */
	const val RESTRICTION_EXPLICIT_DENIAL = "explicit-denial"

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
			// No-match or unconfigured. The kernel does not answer these with an empty
			// screen: `resolveEffectivePolicy` substitutes a safe opt-in rule that asks
			// for a choice, so the subject is prompted and every optional category stays
			// denied until they answer. Hiding the first layer here leaves a device with
			// no way to grant anything, which turns a temporary deny-all into a permanent
			// one. `resolution` still reports `no-match`, because the fallback is never
			// presented as a policy the backend matched.
			//
			// A `failed` resolution never reaches this branch: it keeps `policyPending`
			// set and answers like a cold start, which is the one exception rule 5 names.
			return snapshot.copy(
				model = ConsentModel.OPT_IN,
				activeUI = ActiveUI.BANNER,
				promptRequirement = PromptRequirement(
					notice = true,
					acknowledge = true,
					purpose = PromptPurpose.INITIAL,
				),
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

		// The snapshot's signal is already the override-merged view, so reading
		// `active` is the whole rule. Reading `detected` here would let a device
		// report override an app that turned GPC off.
		val gpcActive = snapshot.privacySignals.gpc.active
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
			val decision = choice?.valueOf(category)
			val authority = authorityOf(choice, category, policy, now)

			// Reasons are gathered before the permission is decided, in the order the
			// kernel pushes them, because the pair `["explicit-denial", "strict-scope"]`
			// is a wire value and not a set. A recorded `false` is first and is gathered
			// whatever the authority says: a denial never ages, and it survives a lapsed
			// receipt and a moved fingerprint alike.
			val reasons = mutableListOf<String>()
			if (decision == false) {
				reasons += RESTRICTION_EXPLICIT_DENIAL
			}
			if (!inScope && policy.scopeMode == ScopeMode.STRICT) {
				reasons += RESTRICTION_STRICT_SCOPE
			}
			if (gpcActive && category in policy.gpcDenyCategories) {
				reasons += RESTRICTION_GPC
			}
			if (category in directiveCategories) {
				reasons += RESTRICTION_DIRECTIVE
			}

			var allowed = defaultPermission(policy.model, inScope, policy.scopeMode)
			if (inScope && decision == true && authority == Authority.VALID) {
				allowed = true
			}
			if (reasons.isNotEmpty()) {
				allowed = false
			}

			permissions[category] = allowed
			if (reasons.isNotEmpty()) {
				restrictions[category.wireName] = reasons.toList()
			}
		}

		val noticeCurrent = noticeDismissal != null &&
			noticeDismissal.covers(policy.noticeFingerprint, now, policy.noticeMs)

		val purpose =
			if (choice == null && noticeDismissal == null) PromptPurpose.INITIAL else PromptPurpose.UPDATE

		// Which obligation is owed, and why. The kernel answers these from the per-
		// category walk it just made rather than from one boolean for the whole
		// receipt, and the difference shows: a refusal suppresses an automatic
		// Accept All even while another category is still unanswered, and an expired
		// grant is a different ask from a fingerprint that moved. Under a `choice`
		// policy only the choice obligation is reported, because that is the only
		// kind the kernel names there -- the notice underneath it is not a second
		// prompt to put on the wire.
		val prompt = when (policy.prompt) {
			PolicyPrompt.CHOICE ->
				choiceReason(choice, policy, restrictions, now)
					?.let { PromptRequirement(acknowledge = true, purpose = purpose, reason = it) }
					?: PromptRequirement.NONE

			PolicyPrompt.NOTICE ->
				noticeReason(noticeDismissal, policy, now)
					?.let { PromptRequirement(notice = true, purpose = purpose, reason = it) }
					?: PromptRequirement.NONE

			PolicyPrompt.NONE -> PromptRequirement.NONE
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
			model = policy.model.runtimeModel,
			activeUI = if (prompt.notice || prompt.acknowledge) ActiveUI.BANNER else ActiveUI.NONE,
			promptRequirement = prompt,
			effectivePermissions = state,
			restrictions = restrictions,
			nextDeadline = nextDeadline,
			evaluatedAt = now,
		)
	}

	/**
	 * How far a stored decision still stands as an authority.
	 *
	 * This is `decisionAuthority` in `packages/core/src/consent-record/evaluate.ts`.
	 * The kernel judges it per category and this core stores one fingerprint and one
	 * action time for a whole commit, so the two that vary by category are presence
	 * and value; the basis and the age apply to the commit as a whole, which is the
	 * same answer either way.
	 */
	private fun authorityOf(
		choice: com.c15t.core.model.ExplicitChoice?,
		category: ConsentCategory,
		policy: EvaluationPolicy,
		now: Long,
	): Authority {
		if (choice?.valueOf(category) == null) {
			return Authority.ABSENT
		}
		if (!choice.matchesFingerprint(policy.choiceFingerprint)) {
			return Authority.POLICY_CHANGED
		}
		// The same boundary the receipts have always been judged against here, so
		// closing the evaluator's three gaps does not move the expiry instant too.
		return if (now - choice.actionAt > policy.choiceMs) Authority.EXPIRED else Authority.VALID
	}

	/**
	 * The permission a policy gives before any decision or restriction.
	 *
	 * Out of scope the answer comes from `scopeMode` alone and never reads the model,
	 * which is the whole of divergence 1 in `docs/internal/evaluator-parity.md`: a
	 * permissive policy allows an ungoverned category under `opt-in` and under `iab`,
	 * and a strict one refuses it under all four. In scope, only `opt-out` and `none`
	 * permit until something says otherwise, and `iab` shares `opt-in`'s answer rather
	 * than inventing one -- a purpose with no consent behind it is a purpose no TC
	 * String could vouch for.
	 */
	private fun defaultPermission(
		model: ConsentModel,
		inScope: Boolean,
		scopeMode: ScopeMode,
	): Boolean = if (!inScope) {
		scopeMode == ScopeMode.PERMISSIVE
	} else {
		model == ConsentModel.OPT_OUT || model == ConsentModel.NONE
	}

	/**
	 * Why an Accept All is owed, or `null` when nothing is.
	 *
	 * `deriveChoiceRequirement` copied. The order is the rule: a refusal anywhere in
	 * the scope the prompt aggregates wins first, because an automatic prompt must not
	 * solicit the reversal of a denial; then nothing recorded at all; then a basis the
	 * current policy no longer covers, which outranks both a gap and a lapse. Only
	 * after those does an expired grant answer, and a denial never reaches it -- the
	 * restriction above already silenced the prompt.
	 */
	private fun choiceReason(
		choice: com.c15t.core.model.ExplicitChoice?,
		policy: EvaluationPolicy,
		restrictions: Map<String, List<String>>,
		now: Long,
	): PromptReason? {
		val scope = policy.scope
		if (scope.isEmpty()) {
			return null
		}
		if (scope.any { restrictions[it.wireName]?.isNotEmpty() == true }) {
			return null
		}
		val consents = choice?.consents
		if (consents.isNullOrEmpty()) {
			return PromptReason.MISSING
		}
		var missing = false
		var expired = false
		for (category in scope) {
			val authority = authorityOf(choice, category, policy, now)
			if (authority == Authority.POLICY_CHANGED) {
				return PromptReason.POLICY_CHANGED
			}
			when (choice.valueOf(category)) {
				null -> missing = true
				true -> if (authority == Authority.EXPIRED) expired = true
				else -> Unit
			}
		}
		return when {
			missing -> PromptReason.MISSING
			expired -> PromptReason.EXPIRED
			else -> null
		}
	}

	/** Why a notice dismissal is owed, or `null` when the current one still covers it. */
	private fun noticeReason(
		dismissal: NoticeDismissal?,
		policy: EvaluationPolicy,
		now: Long,
	): PromptReason? = when {
		dismissal == null -> PromptReason.MISSING
		dismissal.fingerprint != policy.noticeFingerprint -> PromptReason.POLICY_CHANGED
		now - dismissal.dismissedAt > policy.noticeMs -> PromptReason.EXPIRED
		else -> null
	}
}

/** How far a stored decision still stands, mirroring the kernel's `DecisionAuthority`. */
internal enum class Authority {
	ABSENT,
	VALID,
	EXPIRED,
	POLICY_CHANGED,
}
