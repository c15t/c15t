/**
 * v3 policy derivation — pure functions the kernel calls during
 * `commands.init()` to fold an `InitResponse` onto the snapshot.
 *
 * No DOM, no window, no network. Safe to run in Node, edge, RSC.
 *
 * Where possible these delegate to the v2 pure helpers in
 * `packages/core/src/libs/policy.ts` — those were already framework-
 * neutral and there's no reason to duplicate the logic.
 */
import type { PolicyScopeMode, ResolvedPolicy } from '@c15t/schema/types';
import type { AllConsentNames } from './consent/consent-types';
import { allConsentNames } from './consent/consent-types';
import {
	applyPolicyScopeForRuntimeGating as v2ApplyPolicyScope,
	filterConsentCategoriesByPolicy as v2FilterCategories,
} from './libs/policy';
import type { ConsentState, KernelActiveUI, KernelModel } from './types';

/**
 * Determines the consent model from the resolved policy. Geography is an
 * input to policy resolution, but the kernel only cares about the policy
 * the backend or offline transport selected.
 */
export function deriveModel(
	policy: ResolvedPolicy | null,
	iabEnabled: boolean
): KernelModel {
	if (!policy || policy.model === 'none') return null;
	if (policy.model === 'iab') return iabEnabled ? 'iab' : null;
	return policy.model;
}

/**
 * Derives which UI surface the adapter should render, if any.
 *
 * Rules (mirror v2's `store-updater.ts:166-170` behavior):
 * - If the policy explicitly sets `ui.mode`, use that.
 * - Otherwise, if a model is in effect, default to `'banner'`.
 * - If no model applies, render nothing.
 */
export function deriveActiveUI(
	model: KernelModel,
	policy: ResolvedPolicy | null
): KernelActiveUI {
	const policyMode = policy?.ui?.mode;
	if (
		policyMode === 'none' ||
		policyMode === 'banner' ||
		policyMode === 'dialog'
	) {
		return policyMode;
	}
	if (model === null) {
		return 'none';
	}
	return 'banner';
}

/**
 * Resolves the category allowlist from a policy. Returns an empty array
 * when the policy allows all categories (wildcard or absent) so the
 * kernel can represent "unrestricted" uniformly.
 */
export function deriveCategoryAllowlist(
	policy: ResolvedPolicy | null
): AllConsentNames[] {
	const allowed = policy?.consent?.categories;
	if (!allowed || allowed.length === 0 || allowed.includes('*')) {
		return [];
	}
	return v2FilterCategories(Array.from(allConsentNames), allowed);
}

/**
 * Filters consents for runtime gating using the v2 scope rules. In
 * `strict` mode the input is passed through (storage-time enforcement
 * already trimmed invalid categories). In `permissive` mode, categories
 * outside the allowlist are forced to `true` so gating decisions treat
 * them as granted.
 */
export function applyPolicyScope(
	consents: ConsentState,
	policyCategories: readonly AllConsentNames[],
	scopeMode: PolicyScopeMode
): ConsentState {
	const allowed =
		policyCategories.length === 0 ? undefined : Array.from(policyCategories);
	return v2ApplyPolicyScope(consents, allowed, scopeMode);
}

/**
 * Applies `policy.consent.preselectedCategories` to a consent record
 * where no prior user interaction is present. Matches v2's behavior at
 * `store-updater.ts:203-240`:
 * - If `hasConsented`, user choices win — preselected is ignored.
 * - If no prior consent, preselected categories flip to `true`.
 * - Out-of-policy preselected entries are dropped.
 * - `necessary` is always `true`.
 */
export function applyPreselectedConsents(
	consents: ConsentState,
	policy: ResolvedPolicy | null,
	policyCategories: readonly AllConsentNames[],
	hasConsented: boolean
): ConsentState {
	if (hasConsented) return consents;

	const preselected = policy?.consent?.preselectedCategories;
	if (!Array.isArray(preselected) || preselected.length === 0) {
		return consents;
	}

	const allowlistScope: readonly AllConsentNames[] =
		policyCategories.length === 0
			? Array.from(allConsentNames)
			: policyCategories;
	const allowedPreselected = v2FilterCategories(
		Array.from(allowlistScope),
		preselected
	);
	if (allowedPreselected.length === 0) {
		return { ...consents, necessary: true };
	}

	const preselectedSet = new Set(allowedPreselected);
	const next = { ...consents } as ConsentState;
	for (const category of allConsentNames) {
		next[category] =
			category === 'necessary' ? true : preselectedSet.has(category);
	}
	return next;
}

function isOutOfPolicyCategory(
	category: AllConsentNames,
	policyCategories: readonly AllConsentNames[]
): boolean {
	return policyCategories.length > 0 && !policyCategories.includes(category);
}

function isTrackingCategory(category: AllConsentNames): boolean {
	return category === 'marketing' || category === 'measurement';
}

/**
 * Applies model defaults before a subject has made an explicit choice.
 *
 * Pre-consent runtime state is an enforcement decision, not a UI draft:
 * opt-in/IAB silence denies optional categories; opt-out silence grants
 * categories unless strict scope or GPC says otherwise. This mirrors
 * `interpretStoredConsent()` for the empty stored-consent case.
 */
export function applyModelDefaultsForNoConsent(params: {
	consents: ConsentState;
	policy: ResolvedPolicy | null;
	policyCategories: readonly AllConsentNames[];
	scopeMode: PolicyScopeMode;
	hasConsented: boolean;
	gpc?: boolean;
}): ConsentState {
	if (params.hasConsented || !params.policy?.model) {
		return params.consents;
	}

	const model = params.policy.model;
	if (model !== 'opt-in' && model !== 'opt-out' && model !== 'iab') {
		return { ...params.consents, necessary: true };
	}

	const next = { ...params.consents } as ConsentState;
	for (const category of allConsentNames) {
		if (category === 'necessary') {
			next[category] = true;
			continue;
		}

		if (model === 'opt-out') {
			next[category] =
				!(
					params.gpc === true &&
					params.policy.consent?.gpc === true &&
					isTrackingCategory(category)
				) &&
				!(
					params.scopeMode === 'strict' &&
					isOutOfPolicyCategory(category, params.policyCategories)
				);
			continue;
		}

		next[category] = false;
	}

	return next;
}

/**
 * Convenience: apply all runtime policy-derived transformations in one call.
 * Mirrors what the kernel does inside `commands.init()`.
 *
 * Order:
 *   1. Filter the category allowlist.
 *   2. Apply consent-model defaults for a fresh subject.
 *   3. Apply scope mode for stored/explicit consent.
 *
 * Exported so parity tests can verify the flow in isolation.
 */
export interface PolicyApplyInputs {
	consents: ConsentState;
	hasConsented: boolean;
	policy: ResolvedPolicy | null;
	gpc?: boolean;
}

export interface PolicyApplyResult {
	consents: ConsentState;
	policyCategories: AllConsentNames[];
	policyScopeMode: PolicyScopeMode;
}

export function applyPolicyToConsents(
	input: PolicyApplyInputs
): PolicyApplyResult {
	const policyCategories = deriveCategoryAllowlist(input.policy);
	const scopeMode: PolicyScopeMode =
		input.policy?.consent?.scopeMode ?? 'permissive';
	const modelDefaults = applyModelDefaultsForNoConsent({
		consents: input.consents,
		policy: input.policy,
		policyCategories,
		scopeMode,
		hasConsented: input.hasConsented,
		gpc: input.gpc,
	});
	const scoped = input.hasConsented
		? applyPolicyScope(modelDefaults, policyCategories, scopeMode)
		: modelDefaults;
	return {
		consents: scoped,
		policyCategories,
		policyScopeMode: scopeMode,
	};
}
