/**
 * Group A schema vectors. Inputs describe policy rules, not wire field names;
 * the schema suite maps these through the finalized public schema builder.
 */

/** All model/prompt pairs, including the forbidden notice permission model. */
export const POLICY_MODEL_PROMPT_CASES = [
	{ model: 'opt-in', prompt: 'choice', valid: true },
	{ model: 'opt-in', prompt: 'notice', valid: false },
	{ model: 'opt-in', prompt: 'none', valid: false },
	{ model: 'opt-out', prompt: 'choice', valid: true },
	{ model: 'opt-out', prompt: 'notice', valid: true },
	{ model: 'opt-out', prompt: 'none', valid: true },
	{ model: 'iab', prompt: 'choice', valid: true },
	{ model: 'iab', prompt: 'notice', valid: false },
	{ model: 'iab', prompt: 'none', valid: false },
	{ model: 'notice', prompt: 'notice', valid: false },
	{ model: 'none', prompt: 'none', valid: false },
] as const;

/** Validate before hashing; duplicate GPC mappings are errors, not repairs. */
export const POLICY_GPC_MAPPING_CASES = [
	{ denyCategories: ['marketing', 'measurement'], valid: true },
	{ denyCategories: ['necessary'], valid: false },
	{ denyCategories: ['marketing', 'marketing'], valid: false },
	{ denyCategories: ['unknown'], valid: false },
	{ denyCategories: ['experience'], valid: false },
] as const;

/** Exact browser/header values, separate from explicit developer overrides. */
export const POLICY_GPC_DETECTION_CASES = [
	{ detected: true, source: 'navigator', value: true },
	{ detected: false, source: 'navigator', value: false },
	{ detected: false, source: 'navigator', value: '1' },
	{ detected: false, source: 'navigator', value: 1 },
	{ detected: true, source: 'header', value: '1' },
	{ detected: false, source: 'header', value: '0' },
	{ detected: false, source: 'header', value: 'true' },
] as const;

/** Canonical set representations used by fingerprint producers. */
export const POLICY_CANONICAL_SET_CASES = [
	{
		expected: ['marketing', 'measurement'],
		field: 'scope',
		input: ['measurement', 'marketing', 'measurement'],
	},
	{
		expected: ['disclosure', 'preferences'],
		field: 'rights',
		input: ['preferences', 'disclosure', 'preferences'],
	},
	{
		expected: ['accept', 'reject'],
		field: 'requiredActions',
		input: ['reject', 'accept', 'reject'],
	},
	{
		expected: ['marketing', 'measurement'],
		field: 'gpcDenyCategories',
		input: ['measurement', 'marketing'],
	},
] as const;

/**
 * Compare each mutation to the same policy with choice and notice domains.
 * `changed` and `unchanged` name required comparisons. Unlisted domains
 * impose no assertion, so these fixtures do not invent copy/hash coupling.
 * Presentation is computed for these diagnostics tests only.
 */
export const POLICY_FINGERPRINT_CASES = [
	{
		changed: ['presentation'],
		mutation: { layout: 'column' },
		unchanged: ['policy', 'choice', 'notice'],
	},
	{
		changed: ['presentation'],
		mutation: { actionOrder: ['reject', 'accept'] },
		unchanged: ['policy', 'choice', 'notice'],
	},
	{
		changed: [],
		mutation: { promptReason: 'expired' },
		unchanged: ['policy', 'choice', 'notice', 'presentation'],
	},
	{
		changed: [],
		mutation: { scopeOrder: ['measurement', 'marketing'] },
		unchanged: ['policy', 'choice', 'notice', 'presentation'],
	},
	{
		changed: ['choice'],
		mutation: { choiceLegalCopyRevision: '2' },
		unchanged: ['notice'],
	},
	{
		changed: ['notice'],
		mutation: { noticeLegalCopyRevision: '2' },
		unchanged: ['choice'],
	},
	{
		changed: ['policy'],
		mutation: {
			gpcDenyCategories: ['marketing'],
			materialToChoice: false,
			materialToNotice: false,
		},
		unchanged: ['choice', 'notice'],
	},
	{
		changed: ['policy', 'choice', 'notice'],
		mutation: {
			gpcDenyCategories: ['marketing'],
			materialToChoice: true,
			materialToNotice: true,
		},
	},
] as const;
