import { createEvaluationPolicy } from '../evaluation-policy';
import type { EvaluationPolicyInput } from '../evaluation-policy';
import type {
	CategoryDecision,
	ChoiceBasis,
	EvaluationPolicy,
	ExplicitChoice,
	OptionalConsentCategory,
} from '../types';

export const DAY = 86_400_000;
export const NOW = 1_800_000_000_000;

export const makePolicy = function makePolicy(
	overrides: Partial<EvaluationPolicyInput> = {}
): EvaluationPolicy {
	return createEvaluationPolicy({
		choice: { fingerprint: 'choice-fp-1', maxAgeMs: null },
		model: 'opt-in',
		notice: { fingerprint: 'notice-fp-1', maxAgeMs: null },
		prompt: 'choice',
		scope: ['functionality', 'experience', 'measurement', 'marketing'],
		scopeMode: 'permissive',
		...overrides,
	});
};

export const decision = function decision(
	value: boolean,
	confirmedAt: number,
	basis: ChoiceBasis
): CategoryDecision {
	return { basis, confirmedAt, value };
};

/** Builds a v3 choice where every listed category shares one time and basis. */
export const makeChoice = function makeChoice(
	values: Partial<Record<OptionalConsentCategory, boolean>>,
	confirmedAt: number,
	basis: ChoiceBasis
): ExplicitChoice {
	const categories: ExplicitChoice['categories'] = {};
	for (const [category, value] of Object.entries(values)) {
		categories[category as OptionalConsentCategory] = decision(
			value,
			confirmedAt,
			basis
		);
	}
	return { categories, version: 3 };
};

export const currentBasis = function currentBasis(
	policy: EvaluationPolicy
): ChoiceBasis {
	return { fingerprint: policy.choice.fingerprint, kind: 'choice-v1' };
};
