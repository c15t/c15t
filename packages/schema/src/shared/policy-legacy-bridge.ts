/**
 * TEMPORARY BRIDGE between the v2 policy shape and v3 policy rules.
 *
 * Remove this file in the v3 final sweep together with `policy-schema.ts`,
 * `policy-defaults.ts`, `policyPackPresets`, the `ui` field on
 * `PolicyConfig`/`ResolvedPolicy`, and the legacy `policy`/`policyDecision`
 * fields on `/init` and manifests. Nothing here defines new semantics; it
 * only translates between the two shapes so intermediate PRs stay green and
 * mixed-version deployments stay safe.
 *
 * Lift (v2 to v3):
 *
 * | v2 | v3 |
 * | --- | --- |
 * | `model: 'opt-in'` | opt-in + choice |
 * | `model: 'iab'` | iab + choice |
 * | `model: 'opt-out'`, `ui.mode` banner/dialog/unset | opt-out + choice |
 * | `model: 'opt-out'`, `ui.mode: 'none'` | opt-out + none |
 * | `model: 'none'` | opt-out + none (that is what the v2 deployment did) |
 * | `consent.gpc: true` | deny marketing and measurement, limited to scope |
 * | `consent.expiryDays` | choice validity; notice validity uses the default |
 * | `ui.banner.allowedActions` | choice actions, with accept and reject forced in |
 *
 * Project (v3 to v2):
 *
 * | v3 | v2 |
 * | --- | --- |
 * | opt-in + choice | opt-in, `ui.mode: 'banner'` |
 * | iab + choice | iab |
 * | opt-out + choice | opt-out, `ui.mode: 'banner'` |
 * | opt-out + none | opt-out, `ui.mode: 'none'` |
 * | opt-out + notice | not expressible: conservative v2 opt-in banner |
 * | any GPC mapping | not expressible: a v2 client lets a stored grant bypass the mask |
 * | iab with a restricted or strict scope | not expressible: v2 forces the full permissive scope |
 *
 * The conservative projection is the strictest shape the v2 wire has. It is
 * not proof that an old runtime behaves safely: a v2 client with a stored
 * grant skips the banner and applies that grant. Whether an old client may
 * receive a projected rule at all is a negotiation the backend owner has to
 * prove against a real old runtime; this file only describes the shape.
 */

import type { PolicyDecision, ResolvedPolicy } from '~/api/init';

import { createMaterialPolicyFingerprintSync } from './policy-fingerprint';
import type { PolicyResolution } from './policy-resolution';
import {
	isPolicyOptionalCategory,
	normalizePolicyRule,
	POLICY_OPTIONAL_CATEGORIES,
} from './policy-rule';
import type {
	PolicyChoiceAction,
	PolicyOptionalCategory,
	PolicyRule,
	ResolvedPolicyRule,
} from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';
import type { PolicyConfig } from './policy-runtime';

const DAY_MS = 86_400_000;
const LEGACY_GPC_CATEGORIES: readonly PolicyOptionalCategory[] = [
	'marketing',
	'measurement',
];
const LEGACY_ACTION_ORDER: readonly PolicyChoiceAction[] = [
	'accept',
	'reject',
	'customize',
];

const knownOptional = function knownOptional(
	categories: readonly string[] | undefined
): PolicyOptionalCategory[] | undefined {
	if (!categories) {
		return undefined;
	}
	const trimmed = categories.map((category) => category.trim());
	if (trimmed.includes('*')) {
		return undefined;
	}
	const known = trimmed.filter(isPolicyOptionalCategory);
	return known.length > 0 ? known : undefined;
};

const liftPrompt = function liftPrompt(
	policy: Pick<PolicyConfig, 'consent' | 'ui'>
): Pick<PolicyRule, 'model' | 'prompt'> {
	const model = policy.consent?.model ?? 'opt-in';
	if (model === 'iab') {
		return { model: 'iab', prompt: 'choice' };
	}
	if (model === 'opt-in') {
		return { model: 'opt-in', prompt: 'choice' };
	}
	if (model === 'none' || policy.ui?.mode === 'none') {
		return { model: 'opt-out', prompt: 'none' };
	}
	return { model: 'opt-out', prompt: 'choice' };
};

const liftActions = function liftActions(
	policy: Pick<PolicyConfig, 'ui'>,
	prompt: PolicyRule['prompt']
): PolicyChoiceAction[] | undefined {
	if (prompt !== 'choice') {
		return undefined;
	}
	const configured =
		policy.ui?.banner?.allowedActions ?? policy.ui?.dialog?.allowedActions;
	if (!configured || configured.length === 0) {
		return undefined;
	}
	const actions = new Set<PolicyChoiceAction>(['accept', 'reject']);
	for (const action of configured) {
		actions.add(action);
	}
	return LEGACY_ACTION_ORDER.filter((action) => actions.has(action));
};

const liftValidity = function liftValidity(
	expiryDays: number | undefined
): PolicyRule['validity'] {
	if (
		typeof expiryDays === 'number' &&
		Number.isFinite(expiryDays) &&
		expiryDays > 0
	) {
		return { choiceDays: expiryDays };
	}
	return undefined;
};

/**
 * Lifts a v2 `PolicyConfig` into a v3 `PolicyRule`. BRIDGE.
 *
 * @remarks
 * Presentation on `ui` is dropped except for the allowed-action set. Unknown
 * category names are dropped because the runtime never knew them.
 */
const liftConsentFields = function liftConsentFields(
	policy: PolicyConfig,
	model: PolicyRule['model']
): Pick<
	PolicyRule,
	'categories' | 'scopeMode' | 'preselectedCategories' | 'privacySignals'
> {
	if (model === 'iab') {
		// v2 forced IAB policies to the full wildcard scope. Keep that
		// established default when lifting; new rules may scope IAB explicitly.
		return {};
	}
	const categories = knownOptional(policy.consent?.categories);
	const scope = categories ?? [...POLICY_OPTIONAL_CATEGORIES];
	const preselected = knownOptional(
		policy.consent?.preselectedCategories
	)?.filter((category) => scope.includes(category));
	const gpcDeny =
		policy.consent?.gpc === true
			? LEGACY_GPC_CATEGORIES.filter((category) => scope.includes(category))
			: [];
	const lifted: ReturnType<typeof liftConsentFields> = {};
	if (categories) {
		lifted.categories = categories;
	}
	if (policy.consent?.scopeMode) {
		lifted.scopeMode = policy.consent.scopeMode;
	}
	if (preselected && preselected.length > 0) {
		lifted.preselectedCategories = preselected;
	}
	if (gpcDeny.length > 0) {
		lifted.privacySignals = { gpc: { denyCategories: gpcDeny } };
	}
	return lifted;
};

export const liftLegacyPolicyConfig = function liftLegacyPolicyConfig(
	policy: PolicyConfig
): PolicyRule {
	const { model, prompt } = liftPrompt(policy);
	const rule: PolicyRule = {
		id: policy.id,
		match: policy.match,
		model,
		prompt,
		...liftConsentFields(policy, model),
	};
	const actions = liftActions(policy, prompt);
	if (actions) {
		rule.actions = actions;
	}
	const validity = liftValidity(policy.consent?.expiryDays);
	if (validity) {
		rule.validity = validity;
	}
	if (policy.i18n) {
		rule.i18n = policy.i18n;
	}
	if (policy.proof) {
		rule.proof = policy.proof;
	}
	return rule;
};

/**
 * Lifts a v2 `ResolvedPolicy` (the `/init` or manifest wire shape) into a
 * normalized v3 rule. BRIDGE. Used by new clients talking to producers that
 * predate the contract.
 */
export const liftLegacyResolvedPolicy = function liftLegacyResolvedPolicy(
	policy: ResolvedPolicy
): ResolvedPolicyRule {
	return normalizePolicyRule(
		liftLegacyPolicyConfig({
			consent: { ...policy.consent, model: policy.model },
			i18n: policy.i18n,
			id: policy.id,
			match: { isDefault: true },
			proof: policy.proof,
			ui: policy.ui,
		})
	);
};

const isFullScope = function isFullScope(
	scope: readonly PolicyOptionalCategory[]
): boolean {
	return POLICY_OPTIONAL_CATEGORIES.every((category) =>
		scope.includes(category)
	);
};

const legacyCategories = function legacyCategories(
	rule: ResolvedPolicyRule
): string[] | undefined {
	if (rule.model === 'iab') {
		return ['*'];
	}
	if (isFullScope(rule.scope)) {
		return undefined;
	}
	return ['necessary', ...rule.scope];
};

const legacyUiSurface = function legacyUiSurface(rule: ResolvedPolicyRule): {
	allowedActions: PolicyChoiceAction[];
} {
	return {
		allowedActions: LEGACY_ACTION_ORDER.filter((action) =>
			rule.actions.allowed.includes(action)
		),
	};
};

const legacyConservativeOptInBanner = function legacyConservativeOptInBanner(
	rule: ResolvedPolicyRule
): ResolvedPolicy {
	return {
		consent: {
			categories: legacyCategories({ ...rule, model: 'opt-in' }),
			expiryDays: rule.validity.choiceMs / DAY_MS,
			scopeMode: 'strict',
		},
		i18n: rule.i18n,
		id: rule.id,
		model: 'opt-in',
		proof: rule.proof,
		ui: { mode: 'banner' },
	};
};

/** How faithfully the v2 wire can carry a v3 rule. */
export type LegacyProjectionFidelity = 'exact' | 'degraded' | 'fallback';

/** Honest description of what a v2 client loses for one rule. */
export interface LegacyProjectionReport {
	fidelity: LegacyProjectionFidelity;
	/** Concrete behaviors a v2 client will not enforce. Empty when exact. */
	limitations: string[];
}

/**
 * Describes what a v2 client can and cannot enforce for a v3 rule.
 *
 * @remarks
 * This is a static description of the v2 shape, not proof of old-client
 * behavior. Anything that would widen permission authority on a v2 client
 * is `fallback`: notice prompts, every GPC mapping (a v2 client applies its
 * mask only before a stored choice exists), and IAB rules with a restricted
 * or strict scope (v2 forces the full permissive scope). `degraded` marks
 * semantics a v2 client silently lacks without widening authority. Only
 * `exact` means the v2 wire carries the same behavior; `degraded` is never
 * treated as expressible-with-caveats by anything that decides authority.
 * Even `fallback` is not a safety guarantee on an old runtime, because a
 * stored v2 grant bypasses the projected banner.
 */
export const describeLegacyProjection = function describeLegacyProjection(
	rule: ResolvedPolicyRule
): LegacyProjectionReport {
	const limitations: string[] = [];
	const deny = rule.privacySignals.gpc.denyCategories;
	if (rule.prompt === 'notice') {
		limitations.push(
			'v2 has no notice prompt; the rule projects to the conservative opt-in choice banner, which a stored v2 grant still bypasses.'
		);
	}
	if (deny.length > 0) {
		limitations.push(
			'v2 clients apply the GPC mask only before a stored choice exists, so a stored grant bypasses it; the rule projects to the conservative opt-in choice banner, which that grant also bypasses.'
		);
	}
	if (
		rule.model === 'iab' &&
		(!isFullScope(rule.scope) || rule.scopeMode === 'strict')
	) {
		limitations.push(
			'v2 forces IAB policies to the full permissive scope, which would widen this rule; it projects to the conservative opt-in choice banner and loses IAB on old clients.'
		);
	}
	if (limitations.length > 0) {
		return { fidelity: 'fallback', limitations };
	}
	if (rule.prompt === 'none') {
		limitations.push(
			'v2 clients do not model prompt requirements; rights access depends on the host, not the wire.'
		);
	}
	if (rule.validity.noticeMs !== rule.validity.choiceMs) {
		limitations.push('v2 clients have no notice validity.');
	}
	if (rule.copyRevision !== null) {
		limitations.push(
			'v2 clients cannot re-prompt on a copy revision; only material policy changes re-prompt.'
		);
	}
	if (rule.prompt === 'choice' && !rule.actions.allowed.includes('customize')) {
		limitations.push('v2 clients may still render a customize action.');
	}
	return {
		fidelity: limitations.length > 0 ? 'degraded' : 'exact',
		limitations,
	};
};

/**
 * Whether the v2 wire has any representation of the rule that a v2 client
 * would treat the way v2 treated the same configuration. `false` means the
 * projection is the conservative opt-in banner.
 */
export const isPolicyRuleLegacyExpressible =
	function isPolicyRuleLegacyExpressible(rule: ResolvedPolicyRule): boolean {
		return describeLegacyProjection(rule).fidelity !== 'fallback';
	};

/**
 * Projects a v3 rule onto the v2 `ResolvedPolicy` wire shape. BRIDGE.
 *
 * @remarks
 * A rule the v2 shape cannot express without widening permission authority
 * (notice prompts, any GPC mapping, a scoped or strict IAB rule) projects to
 * the conservative v2 opt-in banner under the same id. That is the strictest
 * v2 shape, not a guarantee: an old client with a stored grant skips the
 * banner. See {@link describeLegacyProjection} for what each rule loses.
 */
export const projectPolicyRuleToLegacy = function projectPolicyRuleToLegacy(
	rule: ResolvedPolicyRule
): ResolvedPolicy {
	if (!isPolicyRuleLegacyExpressible(rule)) {
		return legacyConservativeOptInBanner(rule);
	}
	const expiryDays = rule.validity.choiceMs / DAY_MS;
	if (rule.model === 'iab') {
		return {
			consent: {
				categories: ['*'],
				expiryDays,
				scopeMode: 'permissive',
			},
			i18n: rule.i18n,
			id: rule.id,
			model: 'iab',
			proof: rule.proof,
		};
	}
	const surface = legacyUiSurface(rule);
	return {
		consent: {
			categories: legacyCategories(rule),
			expiryDays,
			preselectedCategories:
				rule.preselectedCategories.length > 0
					? [...rule.preselectedCategories]
					: undefined,
			scopeMode: rule.scopeMode,
		},
		i18n: rule.i18n,
		id: rule.id,
		model: rule.model,
		proof: rule.proof,
		ui:
			rule.prompt === 'none'
				? { mode: 'none' }
				: { banner: surface, dialog: surface, mode: 'banner' },
	};
};

/** Sentinel the v2 resolver emitted when packs existed but nothing matched. */
const LEGACY_NO_MATCH_ID = 'no_banner';

/**
 * Reads the v2 `policy`/`policyDecision` fields of an `/init` response from a
 * producer that predates `policyResolution`. BRIDGE.
 *
 * @remarks
 * v2 collapsed several outcomes: an absent `policy` meant no packs were
 * configured, and the `no_banner` sentinel meant configured packs matched
 * nothing. Both are mapped back to their v3 outcome; every other policy is
 * lifted and fingerprinted here, including the legacy material fingerprint
 * that v2 stored records compare against. A policy that cannot be lifted
 * fails with `invalid-payload`.
 */
export const readLegacyPolicyWire = function readLegacyPolicyWire(input: {
	policy?: ResolvedPolicy | null;
	policyDecision?: PolicyDecision | null;
}): PolicyResolution {
	const { policy } = input;
	if (policy === undefined || policy === null) {
		return { policy: null, status: 'unconfigured' };
	}
	if (policy.id === LEGACY_NO_MATCH_ID && policy.model === 'none') {
		return { policy: null, status: 'no-match' };
	}
	try {
		const rule = liftLegacyResolvedPolicy(policy);
		return {
			fingerprints: {
				...createPolicyRuleFingerprints(rule),
				legacyMaterial: createMaterialPolicyFingerprintSync(policy),
			},
			matchedBy: input.policyDecision?.matchedBy ?? 'default',
			policy: rule,
			policyId: rule.id,
			status: 'matched',
		};
	} catch {
		return { policy: null, reason: 'invalid-payload', status: 'failed' };
	}
};

/**
 * Projects a v3 author rule onto a v2 `PolicyConfig`, keeping the matcher.
 * BRIDGE. Used to fill the legacy fields of a manifest built from rules.
 */
export const projectPolicyRuleToLegacyConfig =
	function projectPolicyRuleToLegacyConfig(rule: PolicyRule): PolicyConfig {
		const projected = projectPolicyRuleToLegacy(normalizePolicyRule(rule));
		return {
			consent: { ...projected.consent, model: projected.model },
			i18n: projected.i18n,
			id: projected.id,
			match: rule.match,
			proof: projected.proof,
			ui: projected.ui,
		};
	};
