/**
 * v3 policy resolution outcomes and the versioned wire contract.
 *
 * Resolution has four outcomes that never collapse into one `null`:
 *
 * - `unconfigured`: the producer had no policy system configured.
 * - `matched`: a configured rule matched.
 * - `no-match`: valid configuration, sufficient inputs, nothing matched.
 * - `failed`: invalid configuration, insufficient inputs, transport failure,
 *   or a wire the client cannot represent.
 *
 * `policy` is explicit on every outcome. `null` means "there is no policy"
 * and tells the kernel to clear policy-derived state. A missing wire is
 * never a substitute for any of these: `readPolicyResolutionWire` fails on
 * it. Old init and manifest wires are unsupported.
 *
 * Every non-matched outcome uses the safe opt-in choice fallback for runtime
 * behavior while the status stays observable. The fallback's fingerprints are
 * constants, so no consumer hashes anything on a construction, hydration or
 * render path.
 */

import {
	collectResolvedPolicyRuleIssues,
	inspectPolicyRules,
	isPlainPolicyObject,
	isPolicyOptionalCategory,
	isPolicyPrompt,
	isPolicyRight,
	isPolicyRuleModel,
	normalizePolicyRule,
	POLICY_PROMPT_ACTIONS,
} from './policy-rule';
import type {
	PolicyOptionalCategory,
	PolicyPromptAction,
	PolicyRight,
	PolicyRule,
	ResolvedPolicyRule,
} from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';
import type { PolicyFingerprints } from './policy-rule-fingerprint';
import type { PolicyMatch, PolicyMatchedBy } from './policy-runtime';

/** Version of the policy wire contract this package produces and reads. */
export const POLICY_CONTRACT_VERSION = 1;

/**
 * Request header a client sends to declare the policy contract version it can
 * represent. `x-c15t-version` stays a telemetry header and is never used to
 * guess policy support.
 */
export const POLICY_CONTRACT_HEADER = 'x-c15t-policy-contract';

/** Why a resolution failed. */
export type PolicyResolutionFailure =
	| 'invalid-configuration'
	| 'insufficient-inputs'
	| 'transport'
	| 'unsupported-contract'
	| 'invalid-payload';

export interface PolicyResolutionUnconfigured {
	status: 'unconfigured';
	policy: null;
}

export interface PolicyResolutionNoMatch {
	status: 'no-match';
	policy: null;
}

export interface PolicyResolutionFailed {
	status: 'failed';
	policy: null;
	reason: PolicyResolutionFailure;
}

export interface PolicyResolutionMatched {
	status: 'matched';
	policy: ResolvedPolicyRule;
	policyId: string;
	matchedBy: PolicyMatchedBy;
	fingerprints: PolicyFingerprints;
}

/** Result of resolving a v3 policy pack for one request. */
export type PolicyResolution =
	| PolicyResolutionUnconfigured
	| PolicyResolutionNoMatch
	| PolicyResolutionFailed
	| PolicyResolutionMatched;

/** Wire form of {@link PolicyResolution}: the same union plus `version`. */
export type PolicyResolutionWire = PolicyResolution & {
	version: typeof POLICY_CONTRACT_VERSION;
};

/** Parses the {@link POLICY_CONTRACT_HEADER} value. */
export const parsePolicyContractHeader = function parsePolicyContractHeader(
	value: string | null | undefined
): number | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	if (!/^\d+$/u.test(trimmed)) {
		return undefined;
	}
	return Number.parseInt(trimmed, 10);
};

const normalizeCountryCode = function normalizeCountryCode(
	countryCode: string | null | undefined
): string | null {
	if (typeof countryCode !== 'string') {
		return null;
	}
	const normalized = countryCode.trim().toUpperCase();
	return normalized || null;
};

const normalizeRegionCode = function normalizeRegionCode(
	regionCode: string | null | undefined
): string | null {
	if (typeof regionCode !== 'string') {
		return null;
	}
	const normalized = (
		regionCode.includes('-') ? regionCode.split('-').pop() : regionCode
	)
		?.trim()
		.toUpperCase();
	return normalized || null;
};

/** Minimal entry the matcher needs. */
export interface PolicyMatchEntry {
	id: string;
	match: PolicyMatch;
}

/** Outcome of matching entries against a location. */
export type PolicyMatchOutcome =
	| { status: 'matched'; index: number; matchedBy: PolicyMatchedBy }
	| { status: 'no-match' }
	| { status: 'insufficient-inputs' };

const findRegionMatch = function findRegionMatch(
	entries: readonly PolicyMatchEntry[],
	countryCode: string,
	regionCode: string
): number {
	return entries.findIndex((entry) =>
		(entry.match.regions ?? []).some(
			(region) =>
				normalizeCountryCode(region.country) === countryCode &&
				normalizeRegionCode(region.region) === regionCode
		)
	);
};

const findCountryMatch = function findCountryMatch(
	entries: readonly PolicyMatchEntry[],
	countryCode: string
): number {
	return entries.findIndex((entry) =>
		(entry.match.countries ?? []).some(
			(country) => normalizeCountryCode(country) === countryCode
		)
	);
};

/**
 * Matches location inputs against ordered entries using the fixed precedence
 * region, country, fallback (unknown location only), default.
 *
 * @remarks
 * When the country is unknown and the pack has neither a fallback nor a
 * default, the inputs were insufficient to evaluate the country and region
 * matchers, which is a failure rather than a no-match. Entries are expected
 * to have passed {@link inspectPolicyRules}; malformed matchers are ignored.
 */
export const matchPolicyRules = function matchPolicyRules(params: {
	entries: readonly PolicyMatchEntry[];
	countryCode: string | null | undefined;
	regionCode: string | null | undefined;
}): PolicyMatchOutcome {
	const { entries } = params;
	const countryCode = normalizeCountryCode(params.countryCode);
	const regionCode = normalizeRegionCode(params.regionCode);

	if (countryCode && regionCode) {
		const index = findRegionMatch(entries, countryCode, regionCode);
		if (index !== -1) {
			return { index, matchedBy: 'region', status: 'matched' };
		}
	}
	if (countryCode) {
		const index = findCountryMatch(entries, countryCode);
		if (index !== -1) {
			return { index, matchedBy: 'country', status: 'matched' };
		}
	}

	const fallbackIndex = entries.findIndex(
		(entry) => entry.match.fallback === true
	);
	const defaultIndex = entries.findIndex(
		(entry) => entry.match.isDefault === true
	);
	if (!countryCode && fallbackIndex !== -1) {
		return { index: fallbackIndex, matchedBy: 'fallback', status: 'matched' };
	}
	if (defaultIndex !== -1) {
		return { index: defaultIndex, matchedBy: 'default', status: 'matched' };
	}
	if (!countryCode) {
		return { status: 'insufficient-inputs' };
	}
	return { status: 'no-match' };
};

const FAILED_CONFIGURATION: PolicyResolutionFailed = {
	policy: null,
	reason: 'invalid-configuration',
	status: 'failed',
};

/**
 * Resolves a v3 policy pack for one request.
 *
 * @remarks
 * Synchronous. Validation failure, an unknown location without a fallback or
 * default, and no match all stay distinct. Fingerprints are computed once
 * here for the matched rule; nothing downstream needs to hash again.
 *
 * @param params - The pack (`undefined` means no policy system) and location.
 * @returns One of the four resolution outcomes. Never throws.
 * @example
 * ```ts
 * const resolution = resolvePolicyRules({
 *   rules: [policyRulePresets.europeOptIn(), policyRulePresets.worldOptOutNoPrompt()],
 *   countryCode: 'DE',
 *   regionCode: null,
 * });
 * if (resolution.status === 'matched') {
 *   resolution.fingerprints.choice;
 * }
 * ```
 */
export const resolvePolicyRules = function resolvePolicyRules(params: {
	rules?: unknown;
	countryCode: string | null;
	regionCode: string | null;
	iabEnabled?: boolean;
}): PolicyResolution {
	if (params.rules === undefined) {
		return { policy: null, status: 'unconfigured' };
	}
	const { errors } = inspectPolicyRules(
		params.rules,
		params.iabEnabled === undefined
			? undefined
			: { iabEnabled: params.iabEnabled }
	);
	if (errors.length > 0 || !Array.isArray(params.rules)) {
		return FAILED_CONFIGURATION;
	}
	const rules = params.rules as PolicyRule[];
	if (rules.length === 0) {
		return { policy: null, status: 'no-match' };
	}
	try {
		const outcome = matchPolicyRules({
			countryCode: params.countryCode,
			entries: rules,
			regionCode: params.regionCode,
		});
		if (outcome.status === 'insufficient-inputs') {
			return { policy: null, reason: 'insufficient-inputs', status: 'failed' };
		}
		if (outcome.status === 'no-match') {
			return { policy: null, status: 'no-match' };
		}
		const rule = rules[outcome.index];
		if (!rule) {
			return FAILED_CONFIGURATION;
		}
		const policy = normalizePolicyRule(rule);
		return {
			fingerprints: createPolicyRuleFingerprints(policy, rule.legacyMaterial),
			matchedBy: outcome.matchedBy,
			policy,
			policyId: policy.id,
			status: 'matched',
		};
	} catch {
		return FAILED_CONFIGURATION;
	}
};

/** Identifier of the runtime fallback rule. Never a matched policy. */
export const SAFE_FALLBACK_POLICY_ID = 'c15t_safe_fallback';

/**
 * The safe opt-in choice fallback used whenever resolution did not match.
 *
 * @remarks
 * Strict scope over every optional category, accept and reject required,
 * customize allowed, disclosure and preferences rights, product-default
 * validity, no GPC mapping. Optional permissions stay denied until a valid
 * explicit choice exists. The resolution status remains observable and the
 * fallback is never reported as a matched policy.
 */
export const safeFallbackPolicyRule =
	function safeFallbackPolicyRule(): ResolvedPolicyRule {
		return {
			actions: {
				allowed: ['accept', 'customize', 'reject'],
				equivalent: [['accept', 'reject']],
				required: ['accept', 'reject'],
			},
			copyRevision: null,
			id: SAFE_FALLBACK_POLICY_ID,
			model: 'opt-in',
			preselectedCategories: [],
			privacySignals: { gpc: { denyCategories: [] } },
			prompt: 'choice',
			proof: { storeIp: false, storeLanguage: false, storeUserAgent: false },
			rights: ['disclosure', 'preferences'],
			scope: ['experience', 'functionality', 'marketing', 'measurement'],
			scopeMode: 'strict',
			validity: { choiceMs: 31_536_000_000, noticeMs: 31_536_000_000 },
		};
	};

/**
 * Precomputed fingerprints of {@link safeFallbackPolicyRule}.
 *
 * @remarks
 * Constants, not runtime hashes: a kernel can adopt the fallback during
 * construction or hydration without touching the hash implementation. A test
 * pins them to `createPolicyRuleFingerprints(safeFallbackPolicyRule())`.
 */
export const SAFE_FALLBACK_POLICY_FINGERPRINTS: Readonly<PolicyFingerprints> = {
	choice: '145fd951c0967e210d905acf5859a93cd03095c0291816b9c424d740048b7a47',
	notice: '4b563e76133c49a5e14cffd9c0a0cc16885b811d9ff77548165cc01ee94996d7',
	policy: 'caadd5bcf45bf76cbc279b3dfe765f2dcd165c510f489c38994e4c9264d9314f',
};

/** Rule and fingerprints the kernel adopts for every non-matched outcome. */
export interface SafeFallbackPolicyInput {
	policy: ResolvedPolicyRule;
	fingerprints: PolicyFingerprints;
}

/** Fresh copy of the fallback rule with its precomputed fingerprints. */
export const safeFallbackPolicyInput =
	function safeFallbackPolicyInput(): SafeFallbackPolicyInput {
		return {
			fingerprints: { ...SAFE_FALLBACK_POLICY_FINGERPRINTS },
			policy: safeFallbackPolicyRule(),
		};
	};

/** Adds the contract version to a resolution for transport. */
export const writePolicyResolutionWire = function writePolicyResolutionWire(
	resolution: PolicyResolution
): PolicyResolutionWire {
	return { ...resolution, version: POLICY_CONTRACT_VERSION };
};

const MATCHED_BY = new Set<string>([
	'region',
	'country',
	'default',
	'fallback',
]);
const FAILURE_REASONS = new Set<string>([
	'invalid-configuration',
	'insufficient-inputs',
	'transport',
	'unsupported-contract',
	'invalid-payload',
]);
const ACTION_SET = new Set<string>(POLICY_PROMPT_ACTIONS);

const WIRE_KEYS = [
	'version',
	'status',
	'policy',
	'reason',
	'policyId',
	'matchedBy',
	'fingerprints',
] as const;
const RULE_WIRE_KEYS = [
	'id',
	'model',
	'prompt',
	'scope',
	'scopeMode',
	'preselectedCategories',
	'actions',
	'rights',
	'validity',
	'privacySignals',
	'copyRevision',
	'i18n',
	'proof',
] as const;
const ACTION_KEYS = ['allowed', 'required', 'equivalent'] as const;
const VALIDITY_KEYS = ['choiceMs', 'noticeMs'] as const;
const PRIVACY_KEYS = ['gpc'] as const;
const GPC_KEYS = ['denyCategories'] as const;
const PROOF_KEYS = ['storeIp', 'storeUserAgent', 'storeLanguage'] as const;
const I18N_KEYS = ['language', 'messageProfile'] as const;
const FINGERPRINT_KEYS = [
	'policy',
	'choice',
	'notice',
	'legacyMaterial',
] as const;

class WireProblem extends Error {
	readonly reason: 'unsupported-contract' | 'invalid-payload';

	constructor(
		reason: 'unsupported-contract' | 'invalid-payload',
		message: string
	) {
		super(message);
		this.name = 'WireProblem';
		this.reason = reason;
	}
}

const invalid = function invalid(message: string): WireProblem {
	return new WireProblem('invalid-payload', message);
};

const unsupported = function unsupported(message: string): WireProblem {
	return new WireProblem('unsupported-contract', message);
};

const own = function own(value: Record<string, unknown>, key: string): unknown {
	return Object.hasOwn(value, key) ? value[key] : undefined;
};

const readObject = function readObject(
	value: unknown,
	field: string,
	allowedKeys: readonly string[]
): Record<string, unknown> {
	if (!isPlainPolicyObject(value)) {
		throw invalid(`${field} must be a plain object`);
	}
	for (const key of Object.getOwnPropertyNames(value)) {
		if (!allowedKeys.includes(key)) {
			throw unsupported(`${field} has unknown field "${key}"`);
		}
	}
	return value;
};

const readStringSet = function readStringSet<ValueType extends string>(
	value: unknown,
	field: string,
	isMember: (item: string) => item is ValueType
): ValueType[] {
	if (!Array.isArray(value)) {
		throw invalid(`${field} must be an array`);
	}
	const result: ValueType[] = [];
	for (const item of value) {
		if (typeof item !== 'string') {
			throw invalid(`${field} must contain strings`);
		}
		if (!isMember(item)) {
			throw unsupported(`${field} has unknown value "${item}"`);
		}
		if (result.includes(item)) {
			throw invalid(`${field} repeats "${item}"`);
		}
		result.push(item);
	}
	return result.sort((left, right) => left.localeCompare(right));
};

const isPromptAction = function isPromptAction(
	value: string
): value is PolicyPromptAction {
	return ACTION_SET.has(value);
};

const isRightValue = function isRightValue(
	value: string
): value is PolicyRight {
	return isPolicyRight(value);
};

const isOptionalCategory = function isOptionalCategory(
	value: string
): value is PolicyOptionalCategory {
	return isPolicyOptionalCategory(value);
};

const readSafeMs = function readSafeMs(value: unknown, field: string): number {
	if (
		typeof value !== 'number' ||
		!Number.isFinite(value) ||
		value <= 0 ||
		value > Number.MAX_SAFE_INTEGER
	) {
		throw invalid(`${field} must be a positive number within the safe range`);
	}
	return value;
};

const readBoolean = function readBoolean(
	value: unknown,
	field: string
): boolean {
	if (typeof value !== 'boolean') {
		throw invalid(`${field} must be a boolean`);
	}
	return value;
};

const readOptionalString = function readOptionalString(
	value: unknown,
	field: string
): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== 'string') {
		throw invalid(`${field} must be a string`);
	}
	return value;
};

const readEnums = function readEnums(value: Record<string, unknown>): {
	model: ResolvedPolicyRule['model'];
	prompt: ResolvedPolicyRule['prompt'];
	scopeMode: ResolvedPolicyRule['scopeMode'];
} {
	const model = own(value, 'model');
	const prompt = own(value, 'prompt');
	const scopeMode = own(value, 'scopeMode');
	if (!isPolicyRuleModel(model)) {
		throw unsupported(`policy.model "${String(model)}" is not supported`);
	}
	if (!isPolicyPrompt(prompt)) {
		throw unsupported(`policy.prompt "${String(prompt)}" is not supported`);
	}
	if (scopeMode !== 'strict' && scopeMode !== 'permissive') {
		throw unsupported(
			`policy.scopeMode "${String(scopeMode)}" is not supported`
		);
	}
	return { model, prompt, scopeMode };
};

const readActions = function readActions(
	value: unknown
): ResolvedPolicyRule['actions'] {
	const actions = readObject(value, 'policy.actions', ACTION_KEYS);
	const equivalent = own(actions, 'equivalent');
	if (!Array.isArray(equivalent)) {
		throw invalid('policy.actions.equivalent must be an array');
	}
	return {
		allowed: readStringSet(
			own(actions, 'allowed'),
			'policy.actions.allowed',
			isPromptAction
		),
		equivalent: equivalent.map((group, index) =>
			readStringSet(
				group,
				`policy.actions.equivalent[${index}]`,
				isPromptAction
			)
		),
		required: readStringSet(
			own(actions, 'required'),
			'policy.actions.required',
			isPromptAction
		),
	};
};

const readValidity = function readValidity(
	value: unknown
): ResolvedPolicyRule['validity'] {
	const validity = readObject(value, 'policy.validity', VALIDITY_KEYS);
	return {
		choiceMs: readSafeMs(own(validity, 'choiceMs'), 'policy.validity.choiceMs'),
		noticeMs: readSafeMs(own(validity, 'noticeMs'), 'policy.validity.noticeMs'),
	};
};

const readProof = function readProof(
	value: unknown
): ResolvedPolicyRule['proof'] {
	const proof = readObject(value, 'policy.proof', PROOF_KEYS);
	return {
		storeIp: readBoolean(own(proof, 'storeIp'), 'policy.proof.storeIp'),
		storeLanguage: readBoolean(
			own(proof, 'storeLanguage'),
			'policy.proof.storeLanguage'
		),
		storeUserAgent: readBoolean(
			own(proof, 'storeUserAgent'),
			'policy.proof.storeUserAgent'
		),
	};
};

const readPrivacySignals = function readPrivacySignals(
	value: unknown
): ResolvedPolicyRule['privacySignals'] {
	const signals = readObject(value, 'policy.privacySignals', PRIVACY_KEYS);
	const gpc = readObject(
		own(signals, 'gpc'),
		'policy.privacySignals.gpc',
		GPC_KEYS
	);
	return {
		gpc: {
			denyCategories: readStringSet(
				own(gpc, 'denyCategories'),
				'policy.privacySignals.gpc.denyCategories',
				isOptionalCategory
			),
		},
	};
};

const readI18n = function readI18n(value: unknown): ResolvedPolicyRule['i18n'] {
	if (value === undefined) {
		return undefined;
	}
	const i18n = readObject(value, 'policy.i18n', I18N_KEYS);
	const language = readOptionalString(
		own(i18n, 'language'),
		'policy.i18n.language'
	);
	const messageProfile = readOptionalString(
		own(i18n, 'messageProfile'),
		'policy.i18n.messageProfile'
	);
	return {
		...(language !== undefined && { language }),
		...(messageProfile !== undefined && { messageProfile }),
	};
};

const readResolvedPolicyRule = function readResolvedPolicyRule(
	value: unknown
): ResolvedPolicyRule {
	const raw = readObject(value, 'policy', RULE_WIRE_KEYS);
	const id = own(raw, 'id');
	if (typeof id !== 'string' || !id.trim()) {
		throw invalid('policy.id must be a non-empty string');
	}
	const copyRevision = own(raw, 'copyRevision');
	if (copyRevision !== null && typeof copyRevision !== 'string') {
		throw invalid('policy.copyRevision must be a string or null');
	}
	const rule: ResolvedPolicyRule = {
		...readEnums(raw),
		actions: readActions(own(raw, 'actions')),
		copyRevision,
		id,
		preselectedCategories: readStringSet(
			own(raw, 'preselectedCategories'),
			'policy.preselectedCategories',
			isOptionalCategory
		),
		privacySignals: readPrivacySignals(own(raw, 'privacySignals')),
		proof: readProof(own(raw, 'proof')),
		rights: readStringSet(own(raw, 'rights'), 'policy.rights', isRightValue),
		scope: readStringSet(own(raw, 'scope'), 'policy.scope', isOptionalCategory),
		validity: readValidity(own(raw, 'validity')),
	};
	const i18n = readI18n(own(raw, 'i18n'));
	if (i18n) {
		rule.i18n = i18n;
	}
	const issues = collectResolvedPolicyRuleIssues(rule);
	if (issues.length > 0) {
		throw invalid(`policy: ${issues[0]}`);
	}
	return rule;
};

const readFingerprints = function readFingerprints(
	value: unknown
): PolicyFingerprints {
	const raw = readObject(value, 'fingerprints', FINGERPRINT_KEYS);
	const read = function read(field: 'policy' | 'choice' | 'notice'): string {
		const digest = own(raw, field);
		if (typeof digest !== 'string' || !digest) {
			throw invalid(`fingerprints.${field} must be a non-empty string`);
		}
		return digest;
	};
	const legacyMaterial = readOptionalString(
		own(raw, 'legacyMaterial'),
		'fingerprints.legacyMaterial'
	);
	return {
		choice: read('choice'),
		notice: read('notice'),
		policy: read('policy'),
		...(legacyMaterial !== undefined && { legacyMaterial }),
	};
};

const readMatched = function readMatched(
	input: Record<string, unknown>
): PolicyResolutionMatched {
	const policyId = own(input, 'policyId');
	const matchedBy = own(input, 'matchedBy');
	if (typeof policyId !== 'string' || !policyId) {
		throw invalid('policyId must be a non-empty string');
	}
	if (typeof matchedBy !== 'string' || !MATCHED_BY.has(matchedBy)) {
		throw unsupported(`matchedBy "${String(matchedBy)}" is not supported`);
	}
	const policy = readResolvedPolicyRule(own(input, 'policy'));
	if (policy.id !== policyId) {
		throw invalid('policyId must equal policy.id');
	}
	return {
		fingerprints: readFingerprints(own(input, 'fingerprints')),
		matchedBy: matchedBy as PolicyMatchedBy,
		policy,
		policyId,
		status: 'matched',
	};
};

const readWire = function readWire(input: unknown): PolicyResolution {
	const raw = readObject(input, 'policyResolution', WIRE_KEYS);
	if (!Object.hasOwn(raw, 'version')) {
		throw invalid('policyResolution.version is required');
	}
	if (own(raw, 'version') !== POLICY_CONTRACT_VERSION) {
		throw unsupported(
			`policy contract version ${String(own(raw, 'version'))} is not supported`
		);
	}
	const status = own(raw, 'status');
	const policy = own(raw, 'policy');
	switch (status) {
		case 'unconfigured':
		case 'no-match': {
			if (policy !== null) {
				throw invalid(`policy must be null when status is "${status}"`);
			}
			return { policy: null, status };
		}
		case 'failed': {
			const reason = own(raw, 'reason');
			if (policy !== null) {
				throw invalid('policy must be null when status is "failed"');
			}
			if (typeof reason !== 'string' || !FAILURE_REASONS.has(reason)) {
				throw unsupported(
					`failure reason "${String(reason)}" is not supported`
				);
			}
			return {
				policy: null,
				reason: reason as PolicyResolutionFailure,
				status: 'failed',
			};
		}
		case 'matched':
			return readMatched(raw);
		default:
			throw unsupported(`status "${String(status)}" is not supported`);
	}
};

/**
 * Reads a negotiated `policyResolution` wire value on the client.
 *
 * @remarks
 * Strict by design. A missing or malformed wire is `failed` with
 * `invalid-payload`; an unknown contract version, status, model, prompt,
 * action, right, category, or any unknown own field is `failed` with
 * `unsupported-contract`. Only own fields of plain objects are read. The
 * matched rule must satisfy the same semantic invariants as an authored rule
 * ({@link collectResolvedPolicyRuleIssues}). Never throws; needs no valibot.
 *
 * @param input - The raw `policyResolution` field from `/init`.
 * @returns A {@link PolicyResolution}.
 */
export const readPolicyResolutionWire = function readPolicyResolutionWire(
	input: unknown
): PolicyResolution {
	try {
		return readWire(input);
	} catch (error) {
		if (error instanceof WireProblem) {
			return { policy: null, reason: error.reason, status: 'failed' };
		}
		return { policy: null, reason: 'invalid-payload', status: 'failed' };
	}
};
