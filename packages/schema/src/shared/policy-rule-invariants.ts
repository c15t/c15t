/**
 * Invariants of a resolved v3 policy rule, without the authoring validator.
 *
 * The browser reads a resolved rule off the wire and checks it against these
 * invariants, but never validates, normalizes, matches or hashes an authored
 * pack. Keeping them apart from `policy-rule.ts` keeps that work, and the
 * fingerprint hashing it pulls in, out of client bundles.
 */
import type {
	PolicyActionConstraints,
	PolicyChoiceAction,
	PolicyConsentCategory,
	PolicyOptionalCategory,
	PolicyPrompt,
	PolicyPromptAction,
	PolicyRight,
	PolicyRuleModel,
	ResolvedPolicyRule,
} from './policy-rule';

export const POLICY_CONSENT_CATEGORIES = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const satisfies readonly PolicyConsentCategory[];

/** Optional categories in canonical (sorted) order. */
export const POLICY_OPTIONAL_CATEGORIES = [
	'experience',
	'functionality',
	'marketing',
	'measurement',
] as const satisfies readonly PolicyOptionalCategory[];

export const POLICY_RULE_MODELS = [
	'opt-in',
	'opt-out',
	'iab',
	'none',
] as const satisfies readonly PolicyRuleModel[];

export const POLICY_PROMPTS = [
	'choice',
	'notice',
	'none',
] as const satisfies readonly PolicyPrompt[];

export const POLICY_PROMPT_ACTIONS = [
	'accept',
	'reject',
	'customize',
	'dismiss',
] as const satisfies readonly PolicyPromptAction[];

export const POLICY_RIGHTS = [
	'disclosure',
	'preferences',
	'opt-out',
] as const satisfies readonly PolicyRight[];

/** Valid prompt per model. Anything else fails validation. */
export const POLICY_MODEL_PROMPTS: Readonly<
	Record<PolicyRuleModel, readonly PolicyPrompt[]>
> = {
	iab: ['choice'],
	none: ['none'],
	'opt-in': ['choice'],
	'opt-out': ['choice', 'notice', 'none'],
};

const OPTIONAL_CATEGORY_SET: ReadonlySet<string> = new Set(
	POLICY_OPTIONAL_CATEGORIES
);
const MODEL_SET: ReadonlySet<string> = new Set(POLICY_RULE_MODELS);
const PROMPT_SET: ReadonlySet<string> = new Set(POLICY_PROMPTS);
export const CHOICE_ACTION_SET: ReadonlySet<string> = new Set([
	'accept',
	'reject',
	'customize',
]);
const RIGHT_SET: ReadonlySet<string> = new Set(POLICY_RIGHTS);

export const isPolicyOptionalCategory = function isPolicyOptionalCategory(
	value: string
): value is PolicyOptionalCategory {
	return OPTIONAL_CATEGORY_SET.has(value);
};

export const isPolicyRuleModel = function isPolicyRuleModel(
	value: unknown
): value is PolicyRuleModel {
	return typeof value === 'string' && MODEL_SET.has(value);
};

export const isPolicyPrompt = function isPolicyPrompt(
	value: unknown
): value is PolicyPrompt {
	return typeof value === 'string' && PROMPT_SET.has(value);
};

export const isPolicyRight = function isPolicyRight(
	value: unknown
): value is PolicyRight {
	return typeof value === 'string' && RIGHT_SET.has(value);
};

/** Whether the model permits the prompt. */
export const isValidPolicyPromptForModel = function isValidPolicyPromptForModel(
	model: PolicyRuleModel,
	prompt: PolicyPrompt
): boolean {
	return POLICY_MODEL_PROMPTS[model].includes(prompt);
};

/** Sorted, deduplicated copy of a string set. */
export const canonicalizePolicySet = function canonicalizePolicySet<
	ValueType extends string,
>(values: readonly ValueType[]): ValueType[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
};

/**
 * Plain object with a plain or null prototype. Class instances and objects
 * with a custom prototype are rejected so inherited fields cannot pose as
 * rule data.
 */
export const isPlainPolicyObject = function isPlainPolicyObject(
	value: unknown
): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value) as unknown;
	return prototype === Object.prototype || prototype === null;
};

/** Action constraints every prompt kind implies. */
export const expectedPolicyActions = function expectedPolicyActions(
	prompt: PolicyPrompt,
	configured?: readonly PolicyChoiceAction[]
): PolicyActionConstraints {
	if (prompt === 'choice') {
		const allowed: PolicyPromptAction[] = configured
			? [...configured]
			: ['accept', 'reject', 'customize'];
		return {
			allowed: canonicalizePolicySet([...allowed, 'accept', 'reject']),
			equivalent: [['accept', 'reject']],
			required: ['accept', 'reject'],
		};
	}
	if (prompt === 'notice') {
		return { allowed: ['dismiss'], equivalent: [], required: ['dismiss'] };
	}
	return { allowed: [], equivalent: [], required: [] };
};

/**
 * Rights every rule of a model must carry. `none` owes nothing; a host may
 * still add `preferences` or `disclosure` through `rights`.
 */
export const requiredPolicyRights = function requiredPolicyRights(
	model: PolicyRuleModel
): PolicyRight[] {
	if (model === 'none') {
		return [];
	}
	const required: PolicyRight[] = ['disclosure', 'preferences'];
	if (model === 'opt-out') {
		required.push('opt-out');
	}
	return canonicalizePolicySet(required);
};

const sameSet = function sameSet(
	left: readonly string[],
	right: readonly string[]
): boolean {
	const leftSet = new Set(left);
	const rightSet = new Set(right);
	return (
		leftSet.size === rightSet.size &&
		[...leftSet].every((value) => rightSet.has(value))
	);
};

const hasDuplicates = function hasDuplicates(
	values: readonly string[]
): boolean {
	return new Set(values).size !== values.length;
};

const collectActionInvariantIssues = function collectActionInvariantIssues(
	rule: ResolvedPolicyRule
): string[] {
	const issues: string[] = [];
	const expected = expectedPolicyActions(rule.prompt);
	const { allowed, equivalent, required } = rule.actions;
	if (hasDuplicates(allowed) || hasDuplicates(required)) {
		issues.push('actions must not repeat an action');
	}
	if (!sameSet(required, expected.required)) {
		issues.push(
			`prompt "${rule.prompt}" requires actions [${expected.required.join(', ')}]`
		);
	}
	if (!required.every((action) => allowed.includes(action))) {
		issues.push('actions.allowed must include every required action');
	}
	if (rule.prompt === 'choice') {
		if (!allowed.every((action) => CHOICE_ACTION_SET.has(action))) {
			issues.push('choice prompts allow only accept, reject and customize');
		}
		if (
			equivalent.length !== 1 ||
			!sameSet(equivalent[0] ?? [], ['accept', 'reject'])
		) {
			issues.push('choice prompts require the accept/reject equivalence group');
		}
	} else {
		if (!sameSet(allowed, expected.allowed)) {
			issues.push(
				`prompt "${rule.prompt}" allows actions [${expected.allowed.join(', ')}]`
			);
		}
		if (equivalent.length !== 0) {
			issues.push(`prompt "${rule.prompt}" has no equivalence groups`);
		}
	}
	return issues;
};

const isValidMs = function isValidMs(value: number): boolean {
	return (
		Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER
	);
};

/**
 * Semantic invariants every {@link ResolvedPolicyRule} must satisfy.
 *
 * @remarks
 * Shared by authored normalization, the client wire reader and the valibot
 * wire schema so no consumer accepts a weaker contract than the author
 * path. Structural typing is assumed; this checks meaning.
 *
 * @returns Human-readable issues; empty when the rule is sound.
 */
export const collectResolvedPolicyRuleIssues =
	function collectResolvedPolicyRuleIssues(rule: ResolvedPolicyRule): string[] {
		const issues: string[] = [];
		if (!rule.id.trim()) {
			issues.push('id must be a non-empty string');
		}
		if (!isValidPolicyPromptForModel(rule.model, rule.prompt)) {
			issues.push(
				`model "${rule.model}" does not allow prompt "${rule.prompt}"`
			);
		}
		if (hasDuplicates(rule.scope)) {
			issues.push('scope must not repeat a category');
		}
		if (hasDuplicates(rule.preselectedCategories)) {
			issues.push('preselectedCategories must not repeat a category');
		}
		if (
			(rule.model === 'iab' || rule.model === 'none') &&
			rule.preselectedCategories.length > 0
		) {
			issues.push(`${rule.model} rules cannot preselect categories`);
		}
		if (
			!rule.preselectedCategories.every((category) =>
				rule.scope.includes(category)
			)
		) {
			issues.push('preselectedCategories must be inside scope');
		}
		issues.push(...collectActionInvariantIssues(rule));
		if (hasDuplicates(rule.rights)) {
			issues.push('rights must not repeat a right');
		}
		const requiredRights = requiredPolicyRights(rule.model);
		if (!requiredRights.every((right) => rule.rights.includes(right))) {
			issues.push(
				`model "${rule.model}" requires rights [${requiredRights.join(', ')}]`
			);
		}
		if (
			!isValidMs(rule.validity.choiceMs) ||
			!isValidMs(rule.validity.noticeMs)
		) {
			issues.push(
				'validity must be finite, positive and within the safe range'
			);
		}
		const deny = rule.privacySignals.gpc.denyCategories;
		if (hasDuplicates(deny)) {
			issues.push(
				'privacySignals.gpc.denyCategories must not repeat a category'
			);
		}
		if (!deny.every((category) => rule.scope.includes(category))) {
			issues.push('privacySignals.gpc.denyCategories must be inside scope');
		}
		if (rule.copyRevision !== null && !rule.copyRevision.trim()) {
			issues.push('copyRevision must be null or a non-empty string');
		}
		return issues;
	};
