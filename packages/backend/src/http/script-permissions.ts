/**
 * Which configured scripts a recorded consent allowed.
 *
 * The browser's script loader decides this on every page. The backend
 * repeats the decision once, at save time, from the facts the save carried
 * and the policy it was resolved under, and stores the answer on each
 * script entry as `allowed`. It records permission, not execution: a
 * script can be allowed and still fail to load, or be removed from the page
 * before it runs.
 *
 * The rules mirror core's (`evaluateCategory` for the category permissions,
 * `isEligible` for each script). Where the backend cannot see what the
 * browser saw, it leaves `allowed` out rather than guess. That is every
 * script with IAB TCF fields under an `iab` policy: their gate reads the TC
 * string and the Global Vendor List, which the backend does not evaluate.
 */

import {
	POLICY_OPTIONAL_CATEGORIES,
	satisfiesCategoryCondition,
} from '@c15t/schema';
import type {
	PolicyConsentCategory,
	PolicyOptionalCategory,
	ResolvedPolicyRule,
	SubjectScriptWire,
	SubjectScriptsWire,
} from '@c15t/schema';

import type { RecordedScript } from '../repository/consent';

/** What a save tells the backend about the subject's permissions. */
export interface ScriptPermissionFacts {
	/** The policy the save was resolved under; none without a policy. */
	readonly rule: ResolvedPolicyRule | undefined;
	/** The model the record is filed under. */
	readonly model: string | undefined;
	/** The explicit preference map after scope filtering. */
	readonly preferences: Readonly<Record<string, boolean>> | undefined;
	/** Per-vendor grants the save carried. */
	readonly vendorGrants: Readonly<Record<string, boolean>> | undefined;
	/** Global Privacy Control as the save saw it. */
	readonly gpc: boolean;
}

/**
 * One optional category's permission, as core's `evaluateCategory` computes
 * it. Without a policy there is no scope or default to apply, so only an
 * explicit grant counts.
 */
const permitted = (
	category: PolicyOptionalCategory,
	{ gpc, preferences, rule }: ScriptPermissionFacts
): boolean => {
	const value = preferences?.[category];
	if (!rule) {
		return value === true;
	}
	const inScope = rule.scope.includes(category);
	const restricted =
		value === false ||
		(!inScope && rule.scopeMode === 'strict') ||
		(gpc && rule.privacySignals.gpc.denyCategories.includes(category));
	if (restricted) {
		return false;
	}
	if (inScope && value === true) {
		return true;
	}
	if (!inScope) {
		return rule.scopeMode === 'permissive';
	}
	// Opt-out and none both permit processing until something restricts it.
	return rule.model === 'opt-out' || rule.model === 'none';
};

const categoryPermissions = (
	facts: ScriptPermissionFacts
): Record<PolicyConsentCategory, boolean> => {
	const permissions = { necessary: true } as Record<
		PolicyConsentCategory,
		boolean
	>;
	for (const category of POLICY_OPTIONAL_CATEGORIES) {
		permissions[category] = permitted(category, facts);
	}
	return permissions;
};

const hasIabFields = (script: SubjectScriptWire): boolean =>
	script.vendorId !== undefined ||
	(script.iabPurposes?.length ?? 0) > 0 ||
	(script.iabLegIntPurposes?.length ?? 0) > 0 ||
	(script.iabSpecialFeatures?.length ?? 0) > 0;

/**
 * Whether the consent allowed one script, or `undefined` when the backend
 * cannot tell.
 */
const scriptAllowed = (
	script: SubjectScriptWire,
	permissions: Readonly<Record<PolicyConsentCategory, boolean>>,
	facts: ScriptPermissionFacts
): boolean | undefined => {
	if (script.alwaysLoad) {
		return true;
	}
	const iabModel = facts.model === 'iab';
	if (hasIabFields(script)) {
		// Outside IAB mode the browser refuses IAB-gated scripts outright.
		return iabModel ? undefined : false;
	}
	if (!satisfiesCategoryCondition(script.category, permissions)) {
		return false;
	}
	// A vendor the subject turned off blocks its scripts, except in IAB mode,
	// where the TC string speaks for vendors instead.
	return (
		iabModel ||
		script.vendor === undefined ||
		facts.vendorGrants?.[script.vendor] !== false
	);
};

/**
 * Stamps each configured script with whether the consent allowed it.
 *
 * @param scripts - Scripts the save carried, already validated
 * @param facts - What the save says about the subject's permissions
 * @returns The same entries, each with `allowed` set where it can be known
 */
export const recordScriptPermissions = (
	scripts: SubjectScriptsWire,
	facts: ScriptPermissionFacts
): RecordedScript[] => {
	const permissions = categoryPermissions(facts);
	return scripts.map((script) => {
		const allowed = scriptAllowed(script, permissions, facts);
		return allowed === undefined ? script : { ...script, allowed };
	});
};
