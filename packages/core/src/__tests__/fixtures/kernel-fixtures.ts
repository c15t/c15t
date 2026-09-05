/**
 * Shared kernel test fixtures.
 *
 * Builds real policy resolutions (through the schema normalizer and
 * fingerprint producer) and validated hydration records so tests drive
 * the kernel through its public boundaries instead of snapshot setters.
 */
import type {
	PolicyMatchedBy,
	PolicyResolution,
	PolicyRule,
} from '@c15t/schema/types';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	SAFE_FALLBACK_POLICY_FINGERPRINTS,
} from '@c15t/schema/types';

import type {
	ExplicitChoice,
	OptionalConsentCategory,
} from '../../consent-record/types';
import type { HydrationRecords } from '../../types';

export const NOW = 1_800_000_000_000;
export const DAY = 86_400_000;

/** Choice fingerprint of the safe fallback rule (unconfigured kernels). */
export const FALLBACK_CHOICE_FINGERPRINT =
	SAFE_FALLBACK_POLICY_FINGERPRINTS.choice;

/** A matched resolution for an authored rule. Hashes once, in the test. */
export const matchedResolution = function matchedResolution(
	rule: PolicyRule,
	matchedBy: PolicyMatchedBy = 'default'
): Extract<PolicyResolution, { status: 'matched' }> {
	const policy = normalizePolicyRule(rule);
	return {
		fingerprints: createPolicyRuleFingerprints(policy),
		matchedBy,
		policy,
		policyId: policy.id,
		status: 'matched',
	};
};

export const optInRule = function optInRule(
	overrides: Partial<PolicyRule> = {}
): PolicyRule {
	return {
		id: 'test-opt-in',
		match: { isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
		...overrides,
	};
};

export const optOutRule = function optOutRule(
	overrides: Partial<PolicyRule> = {}
): PolicyRule {
	return {
		id: 'test-opt-out',
		match: { isDefault: true },
		model: 'opt-out',
		prompt: 'choice',
		...overrides,
	};
};

export const noticeRule = function noticeRule(
	overrides: Partial<PolicyRule> = {}
): PolicyRule {
	return optOutRule({ id: 'test-notice', prompt: 'notice', ...overrides });
};

export const iabRule = function iabRule(
	overrides: Partial<PolicyRule> = {}
): PolicyRule {
	return {
		id: 'test-iab',
		match: { isDefault: true },
		model: 'iab',
		prompt: 'choice',
		...overrides,
	};
};

export interface ChoiceOptions {
	/** Confirmation time. Defaults to one second before `now`. */
	confirmedAt?: number;
	/** Clock the records are validated against. Defaults to {@link NOW}. */
	now?: number;
	/** Choice fingerprint. Defaults to the safe fallback rule's. */
	fingerprint?: string;
	/** Use a legacy basis, optionally with a material fingerprint. */
	legacy?: boolean | string;
}

/** A v3 explicit choice for the given values. */
export const explicitChoice = function explicitChoice(
	values: Partial<Record<OptionalConsentCategory, boolean>>,
	options: ChoiceOptions = {}
): ExplicitChoice {
	const confirmedAt = options.confirmedAt ?? (options.now ?? NOW) - 1000;
	const categories: ExplicitChoice['categories'] = {};
	for (const [category, value] of Object.entries(values)) {
		if (typeof value !== 'boolean') {
			continue;
		}
		let basis: ExplicitChoice['categories'][OptionalConsentCategory] extends
			| (infer Decision)
			| undefined
			? Decision extends { basis: infer Basis }
				? Basis
				: never
			: never;
		if (options.legacy === undefined || options.legacy === false) {
			basis = {
				fingerprint: options.fingerprint ?? FALLBACK_CHOICE_FINGERPRINT,
				kind: 'choice-v1',
			};
		} else if (options.legacy === true) {
			basis = { kind: 'legacy-v2' };
		} else {
			basis = { kind: 'legacy-v2', materialFingerprint: options.legacy };
		}
		categories[category as OptionalConsentCategory] = {
			basis,
			confirmedAt,
			value,
		};
	}
	return { categories, version: 3 };
};

/** Hydration records that carry one explicit choice. */
export const choiceRecords = function choiceRecords(
	values: Partial<Record<OptionalConsentCategory, boolean>>,
	options: ChoiceOptions & { subjectId?: string } = {}
): HydrationRecords {
	const records: HydrationRecords = {
		choice: explicitChoice(values, options),
		now: options.now ?? NOW,
	};
	if (options.subjectId) {
		records.subject = { subjectId: options.subjectId };
	}
	return records;
};
