/**
 * Pure consent evaluator.
 *
 * Takes validated records, a resolved policy projection, privacy inputs
 * and an explicit `now`, and derives effective permissions, a separate
 * restriction map, the remaining prompt requirement and the next deadline.
 * No storage, hashing, identity, network, `Date.now`, callbacks or IAB
 * imports. Every caller (construction, hydration, init, actions, privacy
 * changes, expiry timers) is expected to run this same function.
 *
 * @internal
 */

import { OPTIONAL_CONSENT_CATEGORIES } from './types';
import type {
	CategoryDecision,
	CategoryEvaluation,
	ConsentCategory,
	ConsentEvaluation,
	DecisionAuthority,
	EvaluationPolicy,
	ExplicitChoice,
	NoticeDismissal,
	OptionalConsentCategory,
	PrivacyOptOut,
	PromptReason,
	PromptRequirement,
	RestrictionReason,
} from './types';

export interface ConsentEvaluationInput {
	policy: EvaluationPolicy;
	/** Validated explicit choice, or `null` when none is usable. */
	choice: ExplicitChoice | null;
	/** Validated notice dismissal, or `null`. */
	noticeDismissal: NoticeDismissal | null;
	/** Standing privacy directives that apply to this subject/browser. */
	optOuts?: readonly PrivacyOptOut[];
	/** Detected GPC signal. Only a strict `true` counts. */
	gpc?: boolean;
	/** Current time in epoch milliseconds. */
	now: number;
}

/**
 * Whether a decision's basis is compatible with the current policy.
 * Legacy decisions without a material fingerprint are grandfathered, and
 * a legacy fingerprint is only compared to a legacy material fingerprint.
 */
const isBasisCompatible = function isBasisCompatible(
	decision: CategoryDecision,
	policy: EvaluationPolicy
): boolean {
	const { basis } = decision;
	if (basis.kind === 'choice-v1') {
		return basis.fingerprint === policy.choice.fingerprint;
	}
	if (
		basis.materialFingerprint === undefined ||
		policy.legacyMaterialFingerprint === null
	) {
		return true;
	}
	return basis.materialFingerprint === policy.legacyMaterialFingerprint;
};

const decisionExpiry = function decisionExpiry(
	decision: CategoryDecision,
	policy: EvaluationPolicy
): number | null {
	return policy.choice.maxAgeMs === null
		? null
		: decision.confirmedAt + policy.choice.maxAgeMs;
};

const decisionAuthority = function decisionAuthority(
	decision: CategoryDecision | undefined,
	policy: EvaluationPolicy,
	now: number
): { authority: DecisionAuthority; expiresAt: number | null } {
	if (!decision) {
		return { authority: 'absent', expiresAt: null };
	}
	if (!isBasisCompatible(decision, policy)) {
		return { authority: 'policy-changed', expiresAt: null };
	}
	const expiresAt = decisionExpiry(decision, policy);
	if (expiresAt !== null && now >= expiresAt) {
		return { authority: 'expired', expiresAt };
	}
	return { authority: 'valid', expiresAt };
};

const defaultPermission = function defaultPermission(
	policy: EvaluationPolicy,
	inScope: boolean
): boolean {
	if (!inScope) {
		return policy.scopeMode === 'permissive';
	}
	return policy.model === 'opt-out';
};

const collectRestrictions = function collectRestrictions(
	category: OptionalConsentCategory,
	decision: CategoryDecision | undefined,
	inScope: boolean,
	input: ConsentEvaluationInput
): RestrictionReason[] {
	const restrictions: RestrictionReason[] = [];
	if (decision?.value === false) {
		restrictions.push('explicit-denial');
	}
	if (!inScope && input.policy.scopeMode === 'strict') {
		restrictions.push('strict-scope');
	}
	if (input.gpc === true && input.policy.gpcDenyCategories.includes(category)) {
		restrictions.push('gpc');
	}
	if (
		input.optOuts?.some((directive) => directive.categories.includes(category))
	) {
		restrictions.push('opt-out-directive');
	}
	return restrictions;
};

const evaluateCategory = function evaluateCategory(
	category: OptionalConsentCategory,
	input: ConsentEvaluationInput
): CategoryEvaluation {
	const { policy } = input;
	const decision = input.choice?.categories[category];
	const inScope = policy.scope.includes(category);
	const { authority, expiresAt } = decisionAuthority(
		decision,
		policy,
		input.now
	);
	const restrictions = collectRestrictions(category, decision, inScope, input);

	let permitted = defaultPermission(policy, inScope);
	let source: CategoryEvaluation['source'] = 'default';
	if (inScope && decision?.value === true && authority === 'valid') {
		permitted = true;
		source = 'grant';
	}
	if (restrictions.length > 0) {
		permitted = false;
		source = 'restricted';
	}

	return { authority, expiresAt, inScope, permitted, restrictions, source };
};

const requirement = function requirement(
	kind: 'choice' | 'notice',
	reason: PromptReason
): PromptRequirement {
	return { kind, reason };
};

/**
 * Choice prompt aggregation, in this order: no usable record, then a
 * known material mismatch in the required scope, then any required
 * category without a decision, then any required positive decision past
 * its lifetime. A matching denial satisfies coverage regardless of age.
 */
const deriveChoiceRequirement = function deriveChoiceRequirement(
	input: ConsentEvaluationInput,
	categories: Record<OptionalConsentCategory, CategoryEvaluation>
): PromptRequirement {
	const { policy } = input;
	if (policy.scope.length === 0) {
		return { kind: 'none' };
	}
	const decisions = input.choice?.categories;
	if (!decisions || Object.keys(decisions).length === 0) {
		return requirement('choice', 'missing');
	}
	let missing = false;
	let expired = false;
	for (const category of policy.scope) {
		const decision = decisions[category];
		const { authority } = categories[category];
		if (authority === 'policy-changed') {
			return requirement('choice', 'policy-changed');
		}
		if (!decision) {
			missing = true;
		} else if (decision.value && authority === 'expired') {
			expired = true;
		}
	}
	if (missing) {
		return requirement('choice', 'missing');
	}
	if (expired) {
		return requirement('choice', 'expired');
	}
	return { kind: 'none' };
};

const noticeExpiry = function noticeExpiry(
	dismissal: NoticeDismissal,
	policy: EvaluationPolicy
): number | null {
	return policy.notice.maxAgeMs === null
		? null
		: dismissal.dismissedAt + policy.notice.maxAgeMs;
};

/** Notice prompts depend only on the dismissal's fingerprint and lifetime. */
const deriveNoticeRequirement = function deriveNoticeRequirement(
	input: ConsentEvaluationInput
): PromptRequirement {
	const dismissal = input.noticeDismissal;
	if (!dismissal) {
		return requirement('notice', 'missing');
	}
	if (dismissal.fingerprint !== input.policy.notice.fingerprint) {
		return requirement('notice', 'policy-changed');
	}
	const expiresAt = noticeExpiry(dismissal, input.policy);
	if (expiresAt !== null && input.now >= expiresAt) {
		return requirement('notice', 'expired');
	}
	return { kind: 'none' };
};

const derivePromptRequirement = function derivePromptRequirement(
	input: ConsentEvaluationInput,
	categories: Record<OptionalConsentCategory, CategoryEvaluation>
): PromptRequirement {
	switch (input.policy.prompt) {
		case 'choice':
			return deriveChoiceRequirement(input, categories);
		case 'notice':
			return deriveNoticeRequirement(input);
		default:
			return { kind: 'none' };
	}
};

/**
 * Earliest future time at which permissions or the prompt can change.
 * A positive in-scope grant matters when its expiry changes a permission
 * (opt-in and IAB) or a choice prompt; a notice dismissal matters only
 * under a notice prompt.
 */
const deriveNextDeadline = function deriveNextDeadline(
	input: ConsentEvaluationInput,
	categories: Record<OptionalConsentCategory, CategoryEvaluation>
): number | null {
	const { policy } = input;
	const candidates: number[] = [];
	const grantExpiryMatters =
		policy.model !== 'opt-out' || policy.prompt === 'choice';
	if (grantExpiryMatters) {
		for (const category of policy.scope) {
			const evaluation = categories[category];
			const decision = input.choice?.categories[category];
			if (
				decision?.value === true &&
				evaluation.authority === 'valid' &&
				evaluation.expiresAt !== null
			) {
				candidates.push(evaluation.expiresAt);
			}
		}
	}
	const dismissal = input.noticeDismissal;
	if (
		policy.prompt === 'notice' &&
		dismissal &&
		dismissal.fingerprint === policy.notice.fingerprint
	) {
		const expiresAt = noticeExpiry(dismissal, policy);
		if (expiresAt !== null && expiresAt > input.now) {
			candidates.push(expiresAt);
		}
	}
	const future = candidates.filter((candidate) => candidate > input.now);
	return future.length === 0 ? null : Math.min(...future);
};

/** Evaluates one snapshot of records against one policy at `now`. */
export const evaluateConsentRecord = function evaluateConsentRecord(
	input: ConsentEvaluationInput
): ConsentEvaluation {
	const categories = {} as Record<OptionalConsentCategory, CategoryEvaluation>;
	const permissions = { necessary: true } as Record<ConsentCategory, boolean>;
	const restrictions: Partial<
		Record<OptionalConsentCategory, readonly RestrictionReason[]>
	> = {};

	for (const category of OPTIONAL_CONSENT_CATEGORIES) {
		const evaluation = evaluateCategory(category, input);
		categories[category] = evaluation;
		permissions[category] = evaluation.permitted;
		if (evaluation.restrictions.length > 0) {
			restrictions[category] = evaluation.restrictions;
		}
	}

	return {
		categories,
		nextDeadline: deriveNextDeadline(input, categories),
		permissions,
		promptRequirement: derivePromptRequirement(input, categories),
		restrictions,
	};
};
