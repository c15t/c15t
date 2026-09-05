/**
 * Policy derivations the kernel runs on the effective policy rule.
 *
 * Pure. No DOM, no window, no network, no hashing: the rule and its
 * fingerprints arrive resolved, and every non-matched resolution uses the
 * schema's safe opt-in fallback with pinned fingerprints.
 */
import type {
	PolicyFingerprints,
	PolicyResolution,
	ResolvedPolicyRule,
} from '@c15t/schema/types';
import { safeFallbackPolicyInput } from '@c15t/schema/types';

import { createEvaluationPolicy } from './consent-record/evaluation-policy';
import type {
	EvaluationPolicy,
	ExplicitChoice,
	OptionalConsentCategory,
	PromptRequirement,
} from './consent-record/types';
import { deepFreeze } from './libs/freeze-data';
import type { KernelActiveUI, KernelModel } from './types';

/** Rule plus fingerprints the evaluator runs on. */
export interface EffectivePolicy {
	rule: ResolvedPolicyRule;
	fingerprints: PolicyFingerprints;
}

const projectEvaluationPolicy = (
	effective: EffectivePolicy
): EvaluationPolicy => {
	const { rule, fingerprints } = effective;
	return createEvaluationPolicy({
		choice: {
			fingerprint: fingerprints.choice,
			maxAgeMs: Math.round(rule.validity.choiceMs),
		},
		gpcDenyCategories: rule.privacySignals.gpc.denyCategories,
		legacyMaterialFingerprint: fingerprints.legacyMaterial ?? null,
		model: rule.model,
		notice: {
			fingerprint: fingerprints.notice,
			maxAgeMs: Math.round(rule.validity.noticeMs),
		},
		prompt: rule.prompt,
		scope: rule.scope,
		scopeMode: rule.scopeMode,
	});
};

// These are owned immutable defaults, never caller-owned policy objects.
// Every non-matched resolution uses the same rule and validated projection.
const fallback = safeFallbackPolicyInput();
const FALLBACK_EFFECTIVE_POLICY: EffectivePolicy = {
	fingerprints: fallback.fingerprints,
	rule: fallback.policy,
};
deepFreeze(FALLBACK_EFFECTIVE_POLICY);
const FALLBACK_EVALUATION_POLICY = projectEvaluationPolicy(
	FALLBACK_EFFECTIVE_POLICY
);
deepFreeze(FALLBACK_EVALUATION_POLICY);

/**
 * The rule a resolution puts in force: the matched rule, or the safe
 * opt-in choice fallback for `unconfigured`, `no-match` and `failed`.
 * The status stays observable on the snapshot; the fallback is never
 * reported as a matched policy.
 */
export const resolveEffectivePolicy = function resolveEffectivePolicy(
	resolution: PolicyResolution
): EffectivePolicy {
	if (resolution.status === 'matched') {
		return { fingerprints: resolution.fingerprints, rule: resolution.policy };
	}
	return FALLBACK_EFFECTIVE_POLICY;
};

/**
 * Validated evaluator projection of an effective policy. Validity is
 * rounded to whole milliseconds: a day count multiplied out by the schema
 * can carry floating-point noise, and an expiry a fraction of a millisecond
 * past a timer tick would otherwise never be reached.
 */
export const buildEvaluationPolicy = function buildEvaluationPolicy(
	effective: EffectivePolicy
): EvaluationPolicy {
	if (effective === FALLBACK_EFFECTIVE_POLICY) {
		return FALLBACK_EVALUATION_POLICY;
	}
	return projectEvaluationPolicy(effective);
};

/**
 * Runtime model. An IAB rule only runs as `iab` when the IAB module is
 * enabled; otherwise its categories behave as opt-in, which is what the
 * evaluator already does for the `iab` model.
 */
export const deriveModel = function deriveModel(
	rule: ResolvedPolicyRule,
	iabEnabled: boolean
): KernelModel {
	if (rule.model === 'iab') {
		return iabEnabled ? 'iab' : 'opt-in';
	}
	return rule.model;
};

/**
 * Which surface the first layer should use for the remaining prompt.
 * Visibility follows the prompt requirement, never `hasConsented`. A
 * pending policy and a failed resolution keep the first layer hidden.
 * Adapters resolve the host presentation for a required prompt.
 */
export const deriveActiveUI = function deriveActiveUI(input: {
	promptRequirement: PromptRequirement;
	policyPending: boolean;
	resolution: PolicyResolution;
}): KernelActiveUI {
	if (input.policyPending || input.resolution.status === 'failed') {
		return 'none';
	}
	if (input.promptRequirement.kind === 'none') {
		return 'none';
	}
	if (input.promptRequirement.kind === 'notice') {
		return 'banner';
	}
	return 'banner';
};

/** Values a form would present before any restriction is applied. */
export type PresentedSelection = Partial<
	Record<OptionalConsentCategory, boolean>
>;

/**
 * The selection a no-input `save()` confirms for the active scope: the
 * staged draft value, else the explicit value, else the model's displayed
 * default (allowed under opt-out, preselected under opt-in and IAB). It is
 * deliberately not the effective permission, which may be masked by GPC or
 * an expired grant.
 */
export const presentedSelection = function presentedSelection(
	rule: ResolvedPolicyRule,
	draft: PresentedSelection | null,
	choice: ExplicitChoice | null
): PresentedSelection {
	const selection: PresentedSelection = {};
	for (const category of rule.scope) {
		const staged = draft?.[category];
		if (typeof staged === 'boolean') {
			selection[category] = staged;
			continue;
		}
		const decision = choice?.categories[category];
		if (decision) {
			selection[category] = decision.value;
			continue;
		}
		selection[category] =
			rule.model === 'opt-out'
				? true
				: rule.preselectedCategories.includes(category);
	}
	return selection;
};

/** Every category in the active scope set to one value. */
export const scopeSelection = function scopeSelection(
	rule: ResolvedPolicyRule,
	value: boolean
): PresentedSelection {
	const selection: PresentedSelection = {};
	for (const category of rule.scope) {
		selection[category] = value;
	}
	return selection;
};
