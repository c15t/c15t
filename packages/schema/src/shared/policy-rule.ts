import type { LegacyMaterialCompatibility } from './legacy-material-policy';
/**
 * v3 policy rules: the behavior contract a policy pack entry declares.
 *
 * A rule owns behavior only. It says which permission model applies, which
 * first-layer interaction is required, which categories are in scope, which
 * actions and rights the interaction must offer, how long a choice or a
 * notice dismissal stays valid, and how the Global Privacy Control signal is
 * mapped. Presentation (layout, order, variants, copy) belongs to the host.
 *
 * `PolicyRule` is author input. `ResolvedPolicyRule` is the canonical
 * normalized form: every set is sorted and deduplicated, wildcards are
 * expanded, defaults are filled. The wire carries `ResolvedPolicyRule`, and
 * every fingerprint hashes it.
 *
 * Validation reads own fields of plain objects only and rejects unknown
 * keys, so inherited or extra fields can never smuggle semantics through.
 * `collectResolvedPolicyRuleIssues` holds the semantic invariants shared by
 * authored normalization, the client wire reader and the valibot schema.
 *
 * No valibot here so `@c15t/schema/types` consumers can validate without the
 * runtime. The valibot mirror lives in `policy-wire-schema.ts`.
 */
import type {
	PolicyMatch,
	PolicyScopeMode,
	PolicyValidationResult,
} from './policy-runtime';

/** Permission models. A notice is a prompt, never a model. */
export type PolicyRuleModel = 'opt-in' | 'opt-out' | 'iab';

/** First-layer interaction a rule requires. */
export type PolicyPrompt = 'choice' | 'notice' | 'none';

/** Actions a prompt can offer. `dismiss` belongs to notice prompts only. */
export type PolicyPromptAction = 'accept' | 'reject' | 'customize' | 'dismiss';

/** Actions an author may configure on a choice prompt. */
export type PolicyChoiceAction = Exclude<PolicyPromptAction, 'dismiss'>;

/** Persistent rights a deployment must keep reachable regardless of prompts. */
export type PolicyRight = 'disclosure' | 'preferences' | 'opt-out';

/** Every category the runtime knows about, including `necessary`. */
export type PolicyConsentCategory =
	| 'necessary'
	| 'functionality'
	| 'experience'
	| 'measurement'
	| 'marketing';

/** Categories a subject can decide on. `necessary` is never a choice. */
export type PolicyOptionalCategory = Exclude<
	PolicyConsentCategory,
	'necessary'
>;

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
	'opt-in': ['choice'],
	'opt-out': ['choice', 'notice', 'none'],
};

/** Product default for how long a positive category choice stays valid. */
export const DEFAULT_CHOICE_VALIDITY_DAYS = 365;

/** Product default for how long a notice dismissal stays valid. */
export const DEFAULT_NOTICE_VALIDITY_DAYS = 365;

const DAY_MS = 86_400_000;
const POLICY_CATEGORY_WILDCARD = '*';

/** Review metadata for presets and reviewed deployments. Never hashed. */
export interface PolicyRuleReview {
	/** `pending` until a source review has been recorded. */
	status: 'pending' | 'reviewed';
	/** ISO date of the last review. */
	reviewedOn?: string;
	/** ISO date by which the rule should be reviewed again. */
	reviewBy?: string;
	/** Primary sources the assumptions were checked against. */
	sources?: string[];
	/** Mechanical assumptions the rule encodes. Not a legal verdict. */
	assumptions?: string[];
}

/**
 * Author-facing policy rule. One entry in a v3 policy pack.
 *
 * @remarks
 * Presentation is deliberately absent. Configure layout and variants on the
 * host. `review` documents assumptions and is never part of any fingerprint.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/concepts/policy-packs}
 */
export interface PolicyRule {
	/** Frozen v2 receipt metadata. Never part of resolved behavior or presentation. */
	legacyMaterial?: LegacyMaterialCompatibility;
	id: string;
	match: PolicyMatch;
	model: PolicyRuleModel;
	prompt: PolicyPrompt;
	/**
	 * Optional categories in scope. Omitted or `'*'` means every optional
	 * category. `necessary` is tolerated and dropped. Unknown names are
	 * rejected. Applies to every model, including `iab`.
	 */
	categories?: string[];
	/** How categories outside `categories` behave. Defaults to `permissive`. */
	scopeMode?: PolicyScopeMode;
	/** Categories a preference form pre-selects. Inside scope; never for `iab`. */
	preselectedCategories?: string[];
	/**
	 * Actions a choice prompt offers. `accept` and `reject` are always
	 * required; `customize` is optional. Leave unset for notice and none.
	 */
	actions?: PolicyChoiceAction[];
	/** Extra rights beyond the ones every rule already carries. */
	rights?: PolicyRight[];
	/** Semantic validity in days. Finite and greater than zero. */
	validity?: {
		choiceDays?: number;
		noticeDays?: number;
	};
	/** Explicit privacy-signal handling. Omit to ignore the signal. */
	privacySignals?: {
		gpc?: {
			/** Categories an active GPC signal denies. Inside scope, no `necessary`. */
			denyCategories: string[];
		};
	};
	/**
	 * Author-controlled legal-copy revision. Bump it when the wording a
	 * subject agreed to changes materially; it is hashed into both prompt
	 * fingerprints so returning subjects are asked again.
	 */
	copyRevision?: string;
	i18n?: {
		language?: string;
		messageProfile?: string;
	};
	proof?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
	review?: PolicyRuleReview;
}

/** Action constraints derived from the rule, independent of presentation. */
export interface PolicyActionConstraints {
	/** Every action the prompt may offer, sorted. */
	allowed: PolicyPromptAction[];
	/** Actions presentation cannot remove, sorted. */
	required: PolicyPromptAction[];
	/**
	 * Groups whose members need equivalent prominence and interaction depth.
	 * Order, labels, colors and variants stay host decisions.
	 */
	equivalent: PolicyPromptAction[][];
}

/**
 * Canonical normalized rule. Every set is sorted and deduplicated so two
 * authors writing the same behavior produce identical fingerprints.
 */
export interface ResolvedPolicyRule {
	id: string;
	model: PolicyRuleModel;
	prompt: PolicyPrompt;
	/** Optional categories in scope, sorted. */
	scope: PolicyOptionalCategory[];
	scopeMode: PolicyScopeMode;
	/** Sorted. Always empty for `iab`. */
	preselectedCategories: PolicyOptionalCategory[];
	actions: PolicyActionConstraints;
	/** Sorted. Always contains `disclosure` and `preferences`. */
	rights: PolicyRight[];
	/** Milliseconds. Finite, greater than zero, within the safe integer range. */
	validity: {
		choiceMs: number;
		noticeMs: number;
	};
	privacySignals: {
		gpc: {
			/** Sorted. Empty means the signal is not honored. */
			denyCategories: PolicyOptionalCategory[];
		};
	};
	copyRevision: string | null;
	i18n?: {
		language?: string;
		messageProfile?: string;
	};
	proof: {
		storeIp: boolean;
		storeUserAgent: boolean;
		storeLanguage: boolean;
	};
}

const OPTIONAL_CATEGORY_SET: ReadonlySet<string> = new Set(
	POLICY_OPTIONAL_CATEGORIES
);
const MODEL_SET: ReadonlySet<string> = new Set(POLICY_RULE_MODELS);
const PROMPT_SET: ReadonlySet<string> = new Set(POLICY_PROMPTS);
const CHOICE_ACTION_SET: ReadonlySet<string> = new Set([
	'accept',
	'reject',
	'customize',
]);
const RIGHT_SET: ReadonlySet<string> = new Set(POLICY_RIGHTS);

const RULE_KEYS = [
	'legacyMaterial',
	'id',
	'match',
	'model',
	'prompt',
	'categories',
	'scopeMode',
	'preselectedCategories',
	'actions',
	'rights',
	'validity',
	'privacySignals',
	'copyRevision',
	'i18n',
	'proof',
	'review',
] as const;
const MATCH_KEYS = ['countries', 'regions', 'isDefault', 'fallback'] as const;
const REGION_KEYS = ['country', 'region'] as const;
const VALIDITY_KEYS = ['choiceDays', 'noticeDays'] as const;
const PRIVACY_SIGNAL_KEYS = ['gpc'] as const;
const GPC_KEYS = ['denyCategories'] as const;
const I18N_KEYS = ['language', 'messageProfile'] as const;
const PROOF_KEYS = ['storeIp', 'storeUserAgent', 'storeLanguage'] as const;
const REVIEW_KEYS = [
	'status',
	'reviewedOn',
	'reviewBy',
	'sources',
	'assumptions',
] as const;

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

/** Own property value, or `undefined` when the key is inherited or absent. */
const own = function own(value: Record<string, unknown>, key: string): unknown {
	return Object.hasOwn(value, key) ? value[key] : undefined;
};

/** Own keys not in the allowlist, including non-enumerable ones. */
const unknownKeys = function unknownKeys(
	value: Record<string, unknown>,
	allowed: readonly string[]
): string[] {
	return Object.getOwnPropertyNames(value).filter(
		(key) => !allowed.includes(key)
	);
};

const isStringArray = function isStringArray(
	value: unknown
): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === 'string')
	);
};

/** Finite, greater than zero, and still a safe integer once in milliseconds. */
const isValidDays = function isValidDays(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isFinite(value) &&
		value > 0 &&
		Number.isSafeInteger(Math.round(value * DAY_MS)) &&
		value * DAY_MS <= Number.MAX_SAFE_INTEGER
	);
};

const ruleLabel = function ruleLabel(id: unknown, index: number): string {
	if (typeof id === 'string' && id.trim()) {
		return `'${id.trim()}'`;
	}
	return `at index ${index}`;
};

interface RuleCheck {
	errors: string[];
	label: string;
	rule: Record<string, unknown>;
}

const pushUnknownKeyErrors = function pushUnknownKeyErrors(
	check: RuleCheck,
	value: Record<string, unknown>,
	allowed: readonly string[],
	path: string
): void {
	for (const key of unknownKeys(value, allowed)) {
		check.errors.push(
			`Policy ${check.label} ${path} has unknown field "${key}".`
		);
	}
};

const collectModelPromptErrors = function collectModelPromptErrors(
	check: RuleCheck
): void {
	const { errors, label, rule } = check;
	const model = own(rule, 'model');
	const prompt = own(rule, 'prompt');
	if (!isPolicyRuleModel(model)) {
		errors.push(
			`Policy ${label} model must be one of ${POLICY_RULE_MODELS.join(', ')}.`
		);
		return;
	}
	if (!isPolicyPrompt(prompt)) {
		errors.push(
			`Policy ${label} prompt must be one of ${POLICY_PROMPTS.join(', ')}.`
		);
		return;
	}
	if (!isValidPolicyPromptForModel(model, prompt)) {
		errors.push(
			`Policy ${label} model "${model}" allows prompts [${POLICY_MODEL_PROMPTS[model].join(', ')}], received "${prompt}".`
		);
	}
};

const collectCategoryListErrors = function collectCategoryListErrors(
	check: RuleCheck,
	field: 'categories' | 'preselectedCategories',
	options: { allowWildcard: boolean }
): void {
	const { errors, label, rule } = check;
	const value = own(rule, field);
	if (value === undefined) {
		return;
	}
	if (!isStringArray(value)) {
		errors.push(`Policy ${label} ${field} must be an array of strings.`);
		return;
	}
	for (const category of value) {
		const trimmed = category.trim();
		if (trimmed === 'necessary') {
			continue;
		}
		if (options.allowWildcard && trimmed === POLICY_CATEGORY_WILDCARD) {
			continue;
		}
		if (!isPolicyOptionalCategory(trimmed)) {
			errors.push(
				`Policy ${label} ${field} has unknown category "${category}". Known categories: ${POLICY_CONSENT_CATEGORIES.join(', ')}.`
			);
		}
	}
};

const resolveScope = function resolveScope(
	categories: unknown
): PolicyOptionalCategory[] {
	if (!isStringArray(categories)) {
		return [...POLICY_OPTIONAL_CATEGORIES];
	}
	const trimmed = categories.map((category) => category.trim());
	if (trimmed.includes(POLICY_CATEGORY_WILDCARD)) {
		return [...POLICY_OPTIONAL_CATEGORIES];
	}
	const optional = canonicalizePolicySet(
		trimmed.filter(isPolicyOptionalCategory)
	);
	// An empty list, or one that only names `necessary`, does not restrict
	// optional categories. This mirrors the v2 allowlist semantics.
	return optional.length > 0 ? optional : [...POLICY_OPTIONAL_CATEGORIES];
};

const collectScopeErrors = function collectScopeErrors(check: RuleCheck): void {
	const { errors, label, rule } = check;
	collectCategoryListErrors(check, 'categories', { allowWildcard: true });
	const scopeMode = own(rule, 'scopeMode');
	if (
		scopeMode !== undefined &&
		scopeMode !== 'strict' &&
		scopeMode !== 'permissive'
	) {
		errors.push(`Policy ${label} scopeMode must be "strict" or "permissive".`);
	}
	const preselected = own(rule, 'preselectedCategories');
	if (own(rule, 'model') === 'iab') {
		if (preselected !== undefined) {
			errors.push(
				`Policy ${label} uses model "iab" and cannot define preselectedCategories.`
			);
		}
		return;
	}
	collectCategoryListErrors(check, 'preselectedCategories', {
		allowWildcard: false,
	});
	if (isStringArray(preselected)) {
		const scope = resolveScope(own(rule, 'categories'));
		for (const category of preselected) {
			const trimmed = category.trim();
			if (isPolicyOptionalCategory(trimmed) && !scope.includes(trimmed)) {
				errors.push(
					`Policy ${label} preselectedCategories "${trimmed}" is outside the policy scope.`
				);
			}
		}
	}
};

const collectActionErrors = function collectActionErrors(
	check: RuleCheck
): void {
	const { errors, label, rule } = check;
	const actions = own(rule, 'actions');
	if (actions === undefined) {
		return;
	}
	if (own(rule, 'prompt') !== 'choice') {
		errors.push(
			`Policy ${label} actions can only be configured for prompt "choice".`
		);
		return;
	}
	if (!isStringArray(actions)) {
		errors.push(`Policy ${label} actions must be an array of strings.`);
		return;
	}
	for (const action of actions) {
		if (!CHOICE_ACTION_SET.has(action)) {
			errors.push(
				`Policy ${label} actions has unknown action "${action}". Choice prompts accept accept, reject, customize.`
			);
		}
	}
	for (const required of ['accept', 'reject']) {
		if (!actions.includes(required)) {
			errors.push(
				`Policy ${label} actions must include "${required}". A choice prompt cannot drop it.`
			);
		}
	}
};

const collectRightsErrors = function collectRightsErrors(
	check: RuleCheck
): void {
	const { errors, label, rule } = check;
	const rights = own(rule, 'rights');
	if (rights === undefined) {
		return;
	}
	if (!isStringArray(rights)) {
		errors.push(`Policy ${label} rights must be an array of strings.`);
		return;
	}
	for (const right of rights) {
		if (!isPolicyRight(right)) {
			errors.push(
				`Policy ${label} rights has unknown right "${right}". Known rights: ${POLICY_RIGHTS.join(', ')}.`
			);
		}
	}
};

const collectValidityErrors = function collectValidityErrors(
	check: RuleCheck
): void {
	const { errors, label, rule } = check;
	const validity = own(rule, 'validity');
	if (validity === undefined) {
		return;
	}
	if (!isPlainPolicyObject(validity)) {
		errors.push(`Policy ${label} validity must be an object.`);
		return;
	}
	pushUnknownKeyErrors(check, validity, VALIDITY_KEYS, 'validity');
	for (const field of VALIDITY_KEYS) {
		const value = own(validity, field);
		if (value !== undefined && !isValidDays(value)) {
			errors.push(
				`Policy ${label} validity.${field} must be a finite number of days greater than zero.`
			);
		}
	}
};

const collectPrivacySignalErrors = function collectPrivacySignalErrors(
	check: RuleCheck
): void {
	const { errors, label, rule } = check;
	const privacySignals = own(rule, 'privacySignals');
	if (privacySignals === undefined) {
		return;
	}
	if (!isPlainPolicyObject(privacySignals)) {
		errors.push(`Policy ${label} privacySignals must be an object.`);
		return;
	}
	pushUnknownKeyErrors(
		check,
		privacySignals,
		PRIVACY_SIGNAL_KEYS,
		'privacySignals'
	);
	const gpc = own(privacySignals, 'gpc');
	if (gpc === undefined) {
		return;
	}
	if (!isPlainPolicyObject(gpc)) {
		errors.push(`Policy ${label} privacySignals.gpc must be an object.`);
		return;
	}
	pushUnknownKeyErrors(check, gpc, GPC_KEYS, 'privacySignals.gpc');
	const denyCategories = own(gpc, 'denyCategories');
	if (!isStringArray(denyCategories)) {
		errors.push(
			`Policy ${label} privacySignals.gpc.denyCategories must be an array of category names.`
		);
		return;
	}
	const scope = resolveScope(own(rule, 'categories'));
	const seen = new Set<string>();
	for (const category of denyCategories) {
		if (category === 'necessary') {
			errors.push(
				`Policy ${label} privacySignals.gpc.denyCategories cannot deny "necessary".`
			);
			continue;
		}
		if (!isPolicyOptionalCategory(category)) {
			errors.push(
				`Policy ${label} privacySignals.gpc.denyCategories has unknown category "${category}".`
			);
			continue;
		}
		if (seen.has(category)) {
			errors.push(
				`Policy ${label} privacySignals.gpc.denyCategories repeats "${category}".`
			);
			continue;
		}
		seen.add(category);
		if (!scope.includes(category)) {
			errors.push(
				`Policy ${label} privacySignals.gpc.denyCategories "${category}" is outside the policy scope.`
			);
		}
	}
};

const collectObjectFieldErrors = function collectObjectFieldErrors(
	check: RuleCheck,
	field: 'i18n' | 'proof',
	keys: readonly string[],
	expected: 'string' | 'boolean'
): void {
	const { errors, label, rule } = check;
	const value = own(rule, field);
	if (value === undefined) {
		return;
	}
	if (!isPlainPolicyObject(value)) {
		errors.push(`Policy ${label} ${field} must be an object.`);
		return;
	}
	pushUnknownKeyErrors(check, value, keys, field);
	for (const key of keys) {
		const member = own(value, key);
		if (member !== undefined && typeof member !== expected) {
			errors.push(`Policy ${label} ${field}.${key} must be a ${expected}.`);
		}
	}
};

const collectReviewErrors = function collectReviewErrors(
	check: RuleCheck
): void {
	const { errors, label, rule } = check;
	const review = own(rule, 'review');
	if (review === undefined) {
		return;
	}
	if (!isPlainPolicyObject(review)) {
		errors.push(`Policy ${label} review must be an object.`);
		return;
	}
	pushUnknownKeyErrors(check, review, REVIEW_KEYS, 'review');
	const status = own(review, 'status');
	if (status !== 'pending' && status !== 'reviewed') {
		errors.push(
			`Policy ${label} review.status must be "pending" or "reviewed".`
		);
	}
	for (const field of ['reviewedOn', 'reviewBy'] as const) {
		const value = own(review, field);
		if (value !== undefined && typeof value !== 'string') {
			errors.push(`Policy ${label} review.${field} must be a string.`);
		}
	}
	for (const field of ['sources', 'assumptions'] as const) {
		const value = own(review, field);
		if (value !== undefined && !isStringArray(value)) {
			errors.push(
				`Policy ${label} review.${field} must be an array of strings.`
			);
		}
	}
};

const collectMetadataErrors = function collectMetadataErrors(
	check: RuleCheck
): void {
	const { errors, label, rule } = check;
	const copyRevision = own(rule, 'copyRevision');
	if (copyRevision !== undefined && typeof copyRevision !== 'string') {
		errors.push(`Policy ${label} copyRevision must be a string.`);
	}
	collectObjectFieldErrors(check, 'i18n', I18N_KEYS, 'string');
	collectObjectFieldErrors(check, 'proof', PROOF_KEYS, 'boolean');
	collectReviewErrors(check);
	const legacy = own(check.rule, 'legacyMaterial');
	if (
		legacy !== undefined &&
		(!isPlainPolicyObject(legacy) ||
			typeof legacy.policyFingerprint !== 'string' ||
			!legacy.policyFingerprint ||
			!isPlainPolicyObject(legacy.input))
	) {
		check.errors.push(
			`Policy ${check.label} legacyMaterial must contain a frozen input and policyFingerprint.`
		);
	}
};

const collectRegionMatcherErrors = function collectRegionMatcherErrors(
	check: RuleCheck,
	regions: unknown
): void {
	const { errors, label } = check;
	if (regions === undefined) {
		return;
	}
	if (!Array.isArray(regions)) {
		errors.push(`Policy ${label} match.regions must be an array.`);
		return;
	}
	regions.forEach((region, index) => {
		if (!isPlainPolicyObject(region)) {
			errors.push(`Policy ${label} match.regions[${index}] must be an object.`);
			return;
		}
		pushUnknownKeyErrors(check, region, REGION_KEYS, `match.regions[${index}]`);
		for (const key of REGION_KEYS) {
			const value = own(region, key);
			if (typeof value !== 'string' || !value.trim()) {
				errors.push(
					`Policy ${label} match.regions[${index}].${key} must be a non-empty string.`
				);
			}
		}
	});
};

const hasExplicitMatchers = function hasExplicitMatchers(
	match: Record<string, unknown>
): boolean {
	const countries = own(match, 'countries');
	const regions = own(match, 'regions');
	return (
		(Array.isArray(countries) && countries.length > 0) ||
		(Array.isArray(regions) && regions.length > 0)
	);
};

const collectMatchErrors = function collectMatchErrors(check: RuleCheck): void {
	const { errors, label, rule } = check;
	const match = own(rule, 'match');
	if (!isPlainPolicyObject(match)) {
		errors.push(`Policy ${label} is missing the required 'match' object.`);
		return;
	}
	pushUnknownKeyErrors(check, match, MATCH_KEYS, 'match');
	const countries = own(match, 'countries');
	if (countries !== undefined) {
		if (!isStringArray(countries)) {
			errors.push(
				`Policy ${label} match.countries must be an array of strings.`
			);
		} else if (countries.some((country) => !country.trim())) {
			errors.push(
				`Policy ${label} match.countries cannot contain empty codes.`
			);
		}
	}
	collectRegionMatcherErrors(check, own(match, 'regions'));
	for (const flag of ['isDefault', 'fallback'] as const) {
		const value = own(match, flag);
		if (value !== undefined && typeof value !== 'boolean') {
			errors.push(`Policy ${label} match.${flag} must be a boolean.`);
		}
	}
	if (
		own(match, 'isDefault') !== true &&
		own(match, 'fallback') !== true &&
		!hasExplicitMatchers(match)
	) {
		errors.push(
			`Policy ${label} has no matcher. Add countries or regions, or set match.isDefault=true.`
		);
	}
};

const collectRuleErrors = function collectRuleErrors(
	value: unknown,
	index: number
): string[] {
	if (!isPlainPolicyObject(value)) {
		return [`Policy at index ${index} must be a plain object.`];
	}
	const id = own(value, 'id');
	const label = ruleLabel(id, index);
	const check: RuleCheck = { errors: [], label, rule: value };
	pushUnknownKeyErrors(check, value, RULE_KEYS, 'rule');
	if (typeof id !== 'string' || !id.trim()) {
		check.errors.push(`Policy ${label} is missing a non-empty id.`);
	}
	collectMatchErrors(check);
	collectModelPromptErrors(check);
	collectScopeErrors(check);
	collectActionErrors(check);
	collectRightsErrors(check);
	collectValidityErrors(check);
	collectPrivacySignalErrors(check);
	collectMetadataErrors(check);
	return check.errors;
};

const matchOf = function matchOf(
	rule: Record<string, unknown>
): Record<string, unknown> {
	const match = own(rule, 'match');
	return isPlainPolicyObject(match) ? match : {};
};

const collectPackErrors = function collectPackErrors(
	rules: Record<string, unknown>[],
	options?: { iabEnabled?: boolean }
): string[] {
	const errors: string[] = [];
	const defaults = rules.filter(
		(rule) => own(matchOf(rule), 'isDefault') === true
	);
	if (defaults.length > 1) {
		errors.push('Only one default policy is allowed');
	}
	const fallbacks = rules.filter(
		(rule) => own(matchOf(rule), 'fallback') === true
	);
	if (fallbacks.length > 1) {
		errors.push('Only one fallback policy is allowed');
	}
	const usesIab = rules.some((rule) => own(rule, 'model') === 'iab');
	if (usesIab && options && options.iabEnabled !== true) {
		errors.push(
			'Policies using model="iab" require top-level iab.enabled=true'
		);
	}
	const idToIndex = new Map<string, number>();
	rules.forEach((rule, index) => {
		const rawId = own(rule, 'id');
		const id = typeof rawId === 'string' ? rawId.trim() : '';
		if (!id) {
			return;
		}
		const previous = idToIndex.get(id);
		if (previous === undefined) {
			idToIndex.set(id, index);
			return;
		}
		errors.push(
			`Policy IDs must be unique. Duplicate id '${id}' found at indexes ${previous} and ${index}.`
		);
	});
	return errors;
};

const collectMatcherOverlapWarnings = function collectMatcherOverlapWarnings(
	rules: Record<string, unknown>[],
	warnings: Set<string>
): void {
	const seenCountries = new Map<string, string>();
	const seenRegions = new Map<string, string>();
	rules.forEach((rule, index) => {
		const match = matchOf(rule);
		const rawId = own(rule, 'id');
		const id =
			typeof rawId === 'string' && rawId.trim()
				? rawId.trim()
				: `policy_index_${index}`;
		const countries = own(match, 'countries');
		if (isStringArray(countries)) {
			for (const country of countries) {
				const key = country.trim().toUpperCase();
				const existing = seenCountries.get(key);
				if (existing) {
					warnings.add(
						`Country matcher '${key}' appears in multiple policies (${existing} and '${id}'). First match wins by array order.`
					);
				} else {
					seenCountries.set(key, `'${id}'`);
				}
			}
		}
		const regions = own(match, 'regions');
		if (!Array.isArray(regions)) {
			return;
		}
		for (const region of regions) {
			if (!isPlainPolicyObject(region)) {
				continue;
			}
			const country = own(region, 'country');
			const code = own(region, 'region');
			if (typeof country !== 'string' || typeof code !== 'string') {
				continue;
			}
			const key = `${country.trim().toUpperCase()}-${code.trim().toUpperCase()}`;
			const existing = seenRegions.get(key);
			if (existing) {
				warnings.add(
					`Region matcher '${key}' appears in multiple policies (${existing} and '${id}'). First match wins by array order.`
				);
			} else {
				seenRegions.set(key, `'${id}'`);
			}
		}
	});
};

const collectPackWarnings = function collectPackWarnings(
	rules: Record<string, unknown>[]
): string[] {
	if (rules.length === 0) {
		return [];
	}
	const warnings = new Set<string>();
	const matches = rules.map((rule) => matchOf(rule));
	if (!matches.some((match) => own(match, 'isDefault') === true)) {
		warnings.add(
			'No default policy configured. Requests that do not match region/country resolve to no-match and use the safe opt-in choice fallback.'
		);
	}
	if (!matches.some((match) => own(match, 'fallback') === true)) {
		warnings.add(
			'No fallback policy configured. If geo-location fails, resolution fails and uses the safe opt-in choice fallback. Mark a strict policy with match.fallback=true.'
		);
	}
	rules.forEach((rule, index) => {
		const match = matches[index] ?? {};
		if (own(match, 'isDefault') === true && hasExplicitMatchers(match)) {
			warnings.add(
				`Policy ${ruleLabel(own(rule, 'id'), index)} is marked as default and also defines explicit matchers. Explicit matchers are ignored for default resolution.`
			);
		}
	});
	collectMatcherOverlapWarnings(rules, warnings);
	return [...warnings];
};

/**
 * Inspects a v3 policy pack and returns errors and warnings.
 *
 * @remarks
 * Errors mean the pack is invalid and resolution fails safely. Warnings point
 * at ambiguous or risky configuration, such as a pack without a default
 * matcher. Only own fields of plain objects count; unknown fields anywhere in
 * a rule are errors.
 *
 * @param rules - The pack to inspect. Anything that is not an array is an error.
 * @param options - Pass `iabEnabled` to check that `iab` rules are backed by IAB support.
 * @returns Errors and warnings as human-readable strings.
 * @example
 * ```ts
 * const { errors } = inspectPolicyRules([policyRulePresets.europeOptIn()]);
 * ```
 */
export const inspectPolicyRules = function inspectPolicyRules(
	rules: unknown,
	options?: { iabEnabled?: boolean }
): PolicyValidationResult {
	if (!Array.isArray(rules)) {
		return {
			errors: ['Policy rules must be an array of policy objects.'],
			warnings: [],
		};
	}
	const errors = rules.flatMap((rule, index) => collectRuleErrors(rule, index));
	const objectRules = rules.filter(isPlainPolicyObject);
	if (objectRules.length === rules.length) {
		errors.push(...collectPackErrors(objectRules, options));
	}
	return {
		errors,
		warnings: collectPackWarnings(objectRules),
	};
};

/**
 * Validates a v3 policy pack and throws on the first error.
 *
 * @throws {TypeError} with the first validation error.
 */
export const validatePolicyRules = function validatePolicyRules(
	rules: unknown,
	options?: { iabEnabled?: boolean }
): asserts rules is PolicyRule[] {
	const { errors } = inspectPolicyRules(rules, options);
	if (errors.length > 0) {
		throw new TypeError(errors[0]);
	}
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

/** Rights every rule of a model must carry. */
export const requiredPolicyRights = function requiredPolicyRights(
	model: PolicyRuleModel
): PolicyRight[] {
	const required: PolicyRight[] = ['disclosure', 'preferences'];
	if (model === 'opt-out') {
		required.push('opt-out');
	}
	return canonicalizePolicySet(required);
};

const resolveRights = function resolveRights(rule: PolicyRule): PolicyRight[] {
	return canonicalizePolicySet([
		...requiredPolicyRights(rule.model),
		...(rule.rights ?? []),
	]);
};

const resolvePreselected = function resolvePreselected(
	rule: PolicyRule
): PolicyOptionalCategory[] {
	if (rule.model === 'iab' || !rule.preselectedCategories) {
		return [];
	}
	return canonicalizePolicySet(
		rule.preselectedCategories
			.map((category) => category.trim())
			.filter(isPolicyOptionalCategory)
	);
};

const resolveValidity = function resolveValidity(
	rule: PolicyRule
): ResolvedPolicyRule['validity'] {
	return {
		choiceMs:
			(rule.validity?.choiceDays ?? DEFAULT_CHOICE_VALIDITY_DAYS) * DAY_MS,
		noticeMs:
			(rule.validity?.noticeDays ?? DEFAULT_NOTICE_VALIDITY_DAYS) * DAY_MS,
	};
};

const resolveI18n = function resolveI18n(
	rule: PolicyRule
): ResolvedPolicyRule['i18n'] {
	if (!rule.i18n || (!rule.i18n.language && !rule.i18n.messageProfile)) {
		return undefined;
	}
	return {
		...(rule.i18n.language && { language: rule.i18n.language }),
		...(rule.i18n.messageProfile && {
			messageProfile: rule.i18n.messageProfile,
		}),
	};
};

const resolveGpcDenyCategories = function resolveGpcDenyCategories(
	rule: PolicyRule
): PolicyOptionalCategory[] {
	return canonicalizePolicySet(
		(rule.privacySignals?.gpc?.denyCategories ?? []).filter(
			isPolicyOptionalCategory
		)
	);
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
		if (rule.model === 'iab' && rule.preselectedCategories.length > 0) {
			issues.push('iab rules cannot preselect categories');
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

/**
 * Normalizes a validated rule into its canonical form.
 *
 * @remarks
 * Validation runs first, so an invalid rule throws before anything is
 * hashed. Sets are sorted and deduplicated; the wildcard scope expands to
 * every optional category; validity is converted to milliseconds; every rule
 * carries the universal disclosure and preferences rights.
 *
 * @throws {TypeError} with the first validation error.
 */
export const normalizePolicyRule = function normalizePolicyRule(
	rule: PolicyRule
): ResolvedPolicyRule {
	const errors = collectRuleErrors(rule, 0);
	if (errors.length > 0) {
		throw new TypeError(errors[0]);
	}
	const copyRevision = rule.copyRevision?.trim() || null;
	const i18n = resolveI18n(rule);
	const normalized: ResolvedPolicyRule = {
		actions: expectedPolicyActions(rule.prompt, rule.actions),
		copyRevision,
		id: rule.id.trim(),
		model: rule.model,
		preselectedCategories: resolvePreselected(rule),
		privacySignals: { gpc: { denyCategories: resolveGpcDenyCategories(rule) } },
		prompt: rule.prompt,
		proof: {
			storeIp: rule.proof?.storeIp === true,
			storeLanguage: rule.proof?.storeLanguage === true,
			storeUserAgent: rule.proof?.storeUserAgent === true,
		},
		rights: resolveRights(rule),
		scope: resolveScope(rule.categories),
		scopeMode: rule.scopeMode ?? 'permissive',
		validity: resolveValidity(rule),
	};
	if (i18n) {
		normalized.i18n = i18n;
	}
	const issues = collectResolvedPolicyRuleIssues(normalized);
	if (issues.length > 0) {
		throw new TypeError(`Policy '${normalized.id}': ${issues[0]}`);
	}
	return normalized;
};
