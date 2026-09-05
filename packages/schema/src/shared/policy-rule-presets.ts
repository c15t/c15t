import type { PolicyRule, PolicyRuleReview } from './policy-rule';
import { policyMatchers } from './policy-runtime';

/**
 * Preset Europe pack mode used by {@link policyRulePresets}.
 */
export type EuropePolicyRuleMode = 'opt-in' | 'iab';

const GPC_SOURCE = 'https://www.w3.org/TR/2026/WD-gpc-20260611/';
const CCPA_SOURCE = 'https://oag.ca.gov/privacy/ccpa';
const ICO_SOURCE =
	'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/';
const EDPB_SOURCE =
	'https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf';
const QUEBEC_SOURCE =
	'https://www.cai.gouv.qc.ca/protection-renseignements-personnels/sujets-et-domaines-dinteret/principaux-changements-loi-25';

const SHARED_ASSUMPTIONS = [
	'365-day choice validity is a c15t product default, not a legal requirement.',
	'Equivalent default prominence for accept and reject is a c15t product invariant.',
	'The controller owns processing facts, legal basis, copy and legal review; this preset is starter configuration.',
];

const pendingReview = function pendingReview(
	sources: string[],
	assumptions: string[]
): PolicyRuleReview {
	return {
		assumptions: [...assumptions, ...SHARED_ASSUMPTIONS],
		sources,
		status: 'pending',
	};
};

const fullProof = { storeIp: true, storeLanguage: true, storeUserAgent: true };

const europeRule = function europeRule(mode: EuropePolicyRuleMode): PolicyRule {
	const isIab = mode === 'iab';
	return {
		id: isIab ? 'europe_iab' : 'europe_opt_in',
		match: policyMatchers.merge(
			policyMatchers.iab(),
			policyMatchers.fallback()
		),
		model: mode,
		prompt: 'choice',
		proof: fullProof,
		review: pendingReview(
			[ICO_SOURCE, EDPB_SOURCE],
			isIab
				? [
						'IAB TCF 2.3 only. No TCF 2.4 claim.',
						'Grouping the EEA and the UK is conservative; local requirements and purpose classification still need review.',
						'Used as the geo fallback so an unknown location gets the strictest configured behavior.',
					]
				: [
						'Optional categories stay denied until an explicit choice; consent is never inferred from inactivity.',
						'Grouping the EEA and the UK is conservative; local requirements and purpose classification still need review.',
						'Used as the geo fallback so an unknown location gets the strictest configured behavior.',
					]
		),
		validity: { choiceDays: 365 },
	};
};

const californiaRule = function californiaRule(
	mode: 'opt-in' | 'opt-out'
): PolicyRule {
	const isOptOut = mode === 'opt-out';
	const rule: PolicyRule = {
		id: isOptOut ? 'california_opt_out' : 'california_opt_in',
		match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
		model: mode,
		privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
		prompt: isOptOut ? 'none' : 'choice',
		proof: fullProof,
		review: pendingReview(
			[CCPA_SOURCE, GPC_SOURCE],
			[
				'A user-enabled GPC signal is honored as an opt-out of sale and sharing; it never creates consent.',
				'Mapping GPC to marketing and measurement is a conservative product default and must be checked against actual processing purposes. Not all measurement is sale or sharing.',
				'Removing the browser signal is not a withdrawal of a recorded opt-out.',
				isOptOut
					? 'No first-layer prompt. Disclosure, preferences and the opt-out right stay reachable without a visible banner.'
					: 'Opt-in in California is conservative product behavior, not a claim of a general opt-in mandate.',
			]
		),
		validity: { choiceDays: 365, noticeDays: 365 },
	};
	if (isOptOut) {
		rule.rights = ['preferences'];
	}
	return rule;
};

const quebecRule = function quebecRule(): PolicyRule {
	return {
		id: 'quebec_opt_in',
		match: policyMatchers.regions([{ country: 'CA', region: 'QC' }]),
		model: 'opt-in',
		prompt: 'choice',
		proof: fullProof,
		review: pendingReview(
			[QUEBEC_SOURCE],
			[
				'Opt-in is a conservative CMP configuration pending controller classification.',
				'The Law 25 highest-privacy-default provision does not apply to cookie privacy settings; this preset makes no blanket opt-in claim from it.',
			]
		),
		validity: { choiceDays: 365 },
	};
};

const worldOptOutNoPromptRule = function worldOptOutNoPromptRule(): PolicyRule {
	return {
		id: 'world_opt_out_no_prompt',
		match: policyMatchers.default(),
		model: 'opt-out',
		prompt: 'none',
		proof: { storeIp: false, storeLanguage: false, storeUserAgent: true },
		review: pendingReview(
			[],
			[
				'Intentional allow-by-default configuration with no first-layer prompt. Disclosure, preferences and the opt-out right stay reachable.',
				'This is controller configuration, never the runtime fallback for a failed or unmatched resolution.',
				'No GPC mapping; add privacySignals.gpc where the deployment honors the signal.',
			]
		),
		rights: ['preferences'],
		validity: { choiceDays: 365, noticeDays: 365 },
	};
};

export interface PolicyRulePresets {
	/** Europe opt-in preset (EEA + UK, geo fallback). Choice prompt. */
	europeOptIn: () => PolicyRule;
	/** Europe IAB TCF 2.3 preset (EEA + UK, geo fallback). Choice prompt. */
	europeIab: () => PolicyRule;
	/** California opt-in preset (US-CA). Choice prompt, GPC honored. */
	californiaOptIn: () => PolicyRule;
	/** California opt-out preset (US-CA). No prompt, GPC honored, rights persistent. */
	californiaOptOut: () => PolicyRule;
	/** Quebec opt-in preset (CA-QC). Choice prompt. */
	quebecOptIn: () => PolicyRule;
	/**
	 * Explicit global default: opt-out with no first-layer prompt.
	 * Replaces the v2 `worldNoBanner` model shortcut.
	 */
	worldOptOutNoPrompt: () => PolicyRule;
}

/**
 * Built-in v3 policy rule presets for the existing regional starting points.
 *
 * @remarks
 * These are starter configurations. Each carries `review` metadata with the
 * primary sources and mechanical assumptions it encodes; `review.status` is
 * `pending` until a source review is recorded. None of them makes a
 * deployment compliant on its own.
 *
 * @example
 * ```ts
 * import { policyRulePresets } from '@c15t/schema';
 *
 * const rules = [
 *   policyRulePresets.europeOptIn(),
 *   policyRulePresets.californiaOptOut(),
 *   policyRulePresets.worldOptOutNoPrompt(),
 * ];
 * ```
 */
export const policyRulePresets: PolicyRulePresets = {
	californiaOptIn: () => californiaRule('opt-in'),
	californiaOptOut: () => californiaRule('opt-out'),
	europeIab: () => europeRule('iab'),
	europeOptIn: () => europeRule('opt-in'),
	quebecOptIn: () => quebecRule(),
	worldOptOutNoPrompt: () => worldOptOutNoPromptRule(),
};
