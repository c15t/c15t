import type {
	InitOutput,
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiMode,
} from '@c15t/schema/types';
import type { ConsentState } from '../types/compliance';
import { type AllConsentNames, allConsentNames } from '../types/consent-types';

type ResolvedPolicy = InitOutput['policy'];

export interface PolicyUIState {
	mode: PolicyUiMode;
	actions: PolicyUiAction[];
	layout?: PolicyUiActionGroup[];
	direction?: PolicyUiActionDirection;
	uiProfile?: 'balanced' | 'compact' | 'strict';
	scrollLock?: boolean;
}

export interface PolicyValidationIssue {
	code:
		| 'mode_mismatch'
		| 'action_not_allowed'
		| 'group_layout_mismatch'
		| 'direction_mismatch'
		| 'ui_profile_mismatch'
		| 'scroll_lock_mismatch';
	message: string;
}

function isConsentCategory(value: string): value is AllConsentNames {
	return allConsentNames.includes(value as AllConsentNames);
}

function flattenLayout(layout?: PolicyUiActionGroup[]): PolicyUiAction[] {
	if (!layout) {
		return [];
	}

	return layout.flatMap((group) => (Array.isArray(group) ? group : [group]));
}

/**
 * Applies a policy purpose allowlist to a consent preference object.
 *
 * Any preference key not in `allowedPurposeIds` is forced to `false`.
 * This prevents backend allowlist enforcement errors when clients hold
 * additional consent keys (for example from IAB category mapping).
 * When `allowedPurposeIds` contains `*`, no filtering is applied. `necessary`
 * is always retained.
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

	const allowed = new Set(['necessary', ...allowedPurposeIds]);
	const next = {} as T;

	for (const [key, value] of Object.entries(preferences)) {
		next[key as keyof T] = (allowed.has(key) ? value : false) as T[keyof T];
	}

	return next;
}

/**
 * Strips preference keys that are outside the active policy allowlist.
 *
 * Use this for API payloads when the backend enforces strict purpose scope and
 * rejects unknown preference keys entirely. `necessary` is always retained to
 * stay aligned with `applyPolicyPurposeAllowlist()`.
 */
export function stripDisallowedPreferenceKeys<
	T extends Record<string, boolean>,
>(preferences: T, allowedPurposeIds?: string[]): Partial<T> {
	if (
		!allowedPurposeIds ||
		allowedPurposeIds.length === 0 ||
		allowedPurposeIds.includes('*')
	) {
		return preferences;
	}

	const allowed = new Set(['necessary', ...allowedPurposeIds]);
	const next: Partial<T> = {};

	for (const [key, value] of Object.entries(preferences)) {
		if (allowed.has(key)) {
			next[key as keyof T] = value as T[keyof T];
		}
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
 * Returns whether policy category scope should be enforced as a hard allowlist.
 */
export function shouldEnforcePolicyCategoryScope(
	allowedPurposeIds?: string[] | null,
	scopeMode: 'strict' | 'permissive' | null = 'permissive'
): boolean {
	return (
		scopeMode === 'strict' &&
		Array.isArray(allowedPurposeIds) &&
		allowedPurposeIds.length > 0 &&
		!allowedPurposeIds.includes('*')
	);
}

/**
 * @deprecated No-op retained for API compatibility. Runtime gating respects
 * the current consent state directly; policy scope is enforced at category
 * discovery, render, and save time instead.
 */
export function applyPolicyScopeForRuntimeGating(
	consents: ConsentState,
	_allowedPurposeIds?: string[] | null,
	_scopeMode: 'strict' | 'permissive' | null = 'permissive'
): ConsentState {
	return consents;
}

/**
 * Gets the runtime policy returned by /init, if present.
 */
export function getEffectivePolicy(
	initData?: InitOutput | null
): ResolvedPolicy | undefined {
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

	const expectedLayout = surfacePolicy?.layout;
	if (expectedLayout && expectedLayout.length > 0) {
		const expected = flattenLayout(expectedLayout);
		const actual = state.actions.filter((action) => expected.includes(action));
		if (expected.join('|') !== actual.join('|')) {
			issues.push({
				code: 'group_layout_mismatch',
				message: `UI action order "${actual.join(', ')}" does not match policy layout "${expected.join(', ')}".`,
			});
		}
	}

	if (surfacePolicy?.direction && state.direction) {
		if (surfacePolicy.direction !== state.direction) {
			issues.push({
				code: 'direction_mismatch',
				message: `UI action direction "${state.direction}" does not match policy action direction "${surfacePolicy.direction}".`,
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
