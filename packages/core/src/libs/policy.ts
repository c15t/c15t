import type {
	InitOutput,
	PolicyUiAction,
	PolicyUiMode,
} from '@c15t/schema/types';
import type { ConsentState } from '../types/compliance';
import { type AllConsentNames, allConsentNames } from '../types/consent-types';

type ResolvedPolicy = InitOutput['policy'];

export interface PolicyUIState {
	mode: PolicyUiMode;
	actions: PolicyUiAction[];
	layout?: 'split' | 'inline';
	uiProfile?: 'balanced' | 'compact' | 'strict';
	scrollLock?: boolean;
}

export interface PolicyValidationIssue {
	code:
		| 'mode_mismatch'
		| 'action_not_allowed'
		| 'action_order_mismatch'
		| 'layout_mismatch'
		| 'ui_profile_mismatch'
		| 'scroll_lock_mismatch';
	message: string;
}

function isConsentCategory(value: string): value is AllConsentNames {
	return allConsentNames.includes(value as AllConsentNames);
}

/**
 * Applies a policy purpose allowlist to a consent preference object.
 *
 * Any preference key not in `allowedPurposeIds` is forced to `false`.
 * This prevents backend allowlist enforcement errors when clients hold
 * additional consent keys (for example from IAB category mapping).
 * When `allowedPurposeIds` contains `*`, no filtering is applied.
 */
export function applyPolicyPurposeAllowlist<T extends Record<string, boolean>>(
	preferences: T,
	allowedPurposeIds?: string[]
): T {
	if (
		!allowedPurposeIds ||
		allowedPurposeIds.length === 0 ||
		allowedPurposeIds.includes('*')
	) {
		return preferences;
	}

	const allowed = new Set(allowedPurposeIds);
	const next = {} as T;

	for (const [key, value] of Object.entries(preferences)) {
		next[key as keyof T] = (allowed.has(key) ? value : false) as T[keyof T];
	}

	return next;
}

/**
 * Filters consent categories against a policy purpose allowlist.
 *
 * When allowlist is active, only categories present in it are kept and
 * `necessary` is always retained.
 */
export function filterConsentCategoriesByPolicy(
	categories: AllConsentNames[],
	allowedPurposeIds?: string[] | null
): AllConsentNames[] {
	const uniqueCategories = Array.from(new Set(categories));

	if (
		!allowedPurposeIds ||
		allowedPurposeIds.length === 0 ||
		allowedPurposeIds.includes('*')
	) {
		return uniqueCategories;
	}

	const allowedCategories = new Set<AllConsentNames>([
		'necessary',
		...allowedPurposeIds.filter(isConsentCategory),
	]);
	const filtered = uniqueCategories.filter((category) =>
		allowedCategories.has(category)
	);

	if (!filtered.includes('necessary')) {
		filtered.unshift('necessary');
	}

	return filtered;
}

/**
 * Applies policy scope to runtime gating behavior.
 *
 * Out-of-policy categories are treated as permissive by c15t runtime and are
 * therefore granted for gating decisions (scripts/iframes load normally).
 */
export function applyPolicyScopeForRuntimeGating(
	consents: ConsentState,
	allowedPurposeIds?: string[] | null,
	scopeMode: 'strict' | 'permissive' | null = 'permissive'
): ConsentState {
	if (scopeMode === 'strict') {
		return consents;
	}

	if (
		!allowedPurposeIds ||
		allowedPurposeIds.length === 0 ||
		allowedPurposeIds.includes('*')
	) {
		return consents;
	}

	const allowedCategories = new Set<AllConsentNames>([
		'necessary',
		...allowedPurposeIds.filter(isConsentCategory),
	]);
	const next = { ...consents };

	for (const category of allConsentNames) {
		if (!allowedCategories.has(category)) {
			next[category] = true;
		}
	}

	next.necessary = true;

	return next;
}

/**
 * Gets the runtime policy returned by /init, if present.
 */
export function getEffectivePolicy(
	initData?: InitOutput | null
): ResolvedPolicy {
	return initData?.policy;
}

/**
 * Validates UI state against backend policy constraints.
 */
export function validateUIAgainstPolicy(params: {
	policy?: ResolvedPolicy;
	state: PolicyUIState;
}): PolicyValidationIssue[] {
	const { policy, state } = params;
	if (!policy) {
		return [];
	}

	const issues: PolicyValidationIssue[] = [];

	if (policy.ui?.mode && state.mode !== policy.ui.mode) {
		issues.push({
			code: 'mode_mismatch',
			message: `UI mode "${state.mode}" does not match policy mode "${policy.ui.mode}".`,
		});
	}

	const surfacePolicy =
		state.mode === 'banner'
			? policy.ui?.banner
			: state.mode === 'dialog'
				? policy.ui?.dialog
				: undefined;

	const allowedActions = surfacePolicy?.allowedActions;
	if (allowedActions && allowedActions.length > 0) {
		const disallowed = state.actions.filter(
			(action) => !allowedActions.includes(action)
		);
		if (disallowed.length > 0) {
			issues.push({
				code: 'action_not_allowed',
				message: `UI renders actions not allowed by policy: ${disallowed.join(', ')}`,
			});
		}
	}

	const actionOrder = surfacePolicy?.actionOrder;
	if (actionOrder && actionOrder.length > 0) {
		const expected = [...new Set(actionOrder)];
		const actual = state.actions.filter((action) => expected.includes(action));
		if (expected.join('|') !== actual.join('|')) {
			issues.push({
				code: 'action_order_mismatch',
				message: `UI action order "${actual.join(', ')}" does not match policy action order "${expected.join(', ')}".`,
			});
		}
	}

	if (surfacePolicy?.actionLayout && state.layout) {
		if (surfacePolicy.actionLayout !== state.layout) {
			issues.push({
				code: 'layout_mismatch',
				message: `UI action layout "${state.layout}" does not match policy action layout "${surfacePolicy.actionLayout}".`,
			});
		}
	}

	if (surfacePolicy?.uiProfile && state.uiProfile) {
		if (surfacePolicy.uiProfile !== state.uiProfile) {
			issues.push({
				code: 'ui_profile_mismatch',
				message: `UI profile "${state.uiProfile}" does not match policy UI profile "${surfacePolicy.uiProfile}".`,
			});
		}
	}

	if (
		typeof surfacePolicy?.scrollLock === 'boolean' &&
		typeof state.scrollLock === 'boolean' &&
		surfacePolicy.scrollLock !== state.scrollLock
	) {
		issues.push({
			code: 'scroll_lock_mismatch',
			message: `UI scroll lock "${state.scrollLock ? 'on' : 'off'}" does not match policy scroll lock "${surfacePolicy.scrollLock ? 'on' : 'off'}".`,
		});
	}

	return issues;
}
