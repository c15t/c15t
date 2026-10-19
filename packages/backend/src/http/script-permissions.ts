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
 * browser saw, it leaves `allowed` out rather than guess:
 *
 * - Scripts with IAB TCF fields under an `iab` policy. Their gate reads the
 *   TC string and the Global Vendor List, which the backend does not
 *   evaluate.
 * - Scripts whose answer turns on a category value this save did not
 *   confirm. `preferences` also carries earlier values, and the browser
 *   ignores one whose receipt has expired or was made under another policy.
 *   Only the receipts this save confirmed reach the backend, so it cannot
 *   tell whether an earlier value still counts.
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
	/**
	 * Categories this save confirmed. Values in `preferences` outside it are
	 * earlier ones the backend cannot vouch for. `undefined` when every value
	 * is this save's own, as in a 2.x body without receipts.
	 */
	readonly confirmed: ReadonlySet<string> | undefined;
	/** Per-vendor grants the save carried. */
	readonly vendorGrants: Readonly<Record<string, boolean>> | undefined;
	/** Global Privacy Control as the save saw it. */
	readonly gpc: boolean;
}

/**
 * One optional category's permission for an explicit `value`, as core's
 * `evaluateCategory` computes it. Without a policy there is no scope or
 * default to apply, so only an explicit grant counts.
 */
const permitted = (
	category: PolicyOptionalCategory,
	value: boolean | undefined,
	{ gpc, rule }: ScriptPermissionFacts
): boolean => {
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

/**
 * One category's permission, or `undefined` when it depends on whether an
 * earlier value still counts. The browser treats a lapsed value as absent,
 * so the answer is known when both readings agree.
 */
const categoryPermission = (
	category: PolicyOptionalCategory,
	facts: ScriptPermissionFacts
): boolean | undefined => {
	const value = facts.preferences?.[category];
	const current = permitted(category, value, facts);
	if (
		value === undefined ||
		facts.confirmed === undefined ||
		facts.confirmed.has(category)
	) {
		return current;
	}
	return current === permitted(category, undefined, facts)
		? current
		: undefined;
};

type Permissions = Record<PolicyConsentCategory, boolean>;

/**
 * Every permission set the facts allow: one when each category is known,
 * and one per combination of the unknown ones otherwise.
 */
const possiblePermissions = (facts: ScriptPermissionFacts): Permissions[] =>
	POLICY_OPTIONAL_CATEGORIES.reduce<Permissions[]>(
		(sets, category) => {
			const permission = categoryPermission(category, facts);
			const options = permission === undefined ? [false, true] : [permission];
			return sets.flatMap((set) =>
				options.map((option) => ({ ...set, [category]: option }))
			);
		},
		[{ necessary: true } as Permissions]
	);

/** The condition's value if every possible permission set agrees on it. */
const conditionHolds = (
	condition: SubjectScriptWire['category'],
	possible: readonly Permissions[]
): boolean | undefined => {
	const [first, ...rest] = possible.map((permissions) =>
		satisfiesCategoryCondition(condition, permissions)
	);
	return rest.every((result) => result === first) ? first : undefined;
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
	possible: readonly Permissions[],
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
	const holds = conditionHolds(script.category, possible);
	if (holds !== true) {
		return holds;
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
	const possible = possiblePermissions(facts);
	return scripts.map((script) => {
		const allowed = scriptAllowed(script, possible, facts);
		return allowed === undefined ? script : { ...script, allowed };
	});
};
