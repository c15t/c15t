import type {
	InitOutput,
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiMode,
} from '@c15t/schema/types';
import type { ConsentState } from '../types/compliance';
import { type AllConsentNames } from '../types/consent-types';
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
/**
 * Applies a policy purpose allowlist to a consent preference object.
 *
 * Any preference key not in `allowedPurposeIds` is forced to `false`.
 * This prevents backend allowlist enforcement errors when clients hold
 * additional consent keys (for example from IAB category mapping).
 * When `allowedPurposeIds` contains `*`, no filtering is applied. `necessary`
 * is always retained.
 */
export declare function applyPolicyPurposeAllowlist<
	T extends Record<string, boolean>,
>(preferences: T, allowedPurposeIds?: string[]): T;
/**
 * Strips preference keys that are outside the active policy allowlist.
 *
 * Use this for API payloads when the backend enforces strict purpose scope and
 * rejects unknown preference keys entirely. `necessary` is always retained to
 * stay aligned with `applyPolicyPurposeAllowlist()`.
 */
export declare function stripDisallowedPreferenceKeys<
	T extends Record<string, boolean>,
>(preferences: T, allowedPurposeIds?: string[]): Partial<T>;
/**
 * Filters consent categories against a policy purpose allowlist.
 *
 * When allowlist is active, only categories present in it are kept and
 * `necessary` is always retained.
 */
export declare function filterConsentCategoriesByPolicy(
	categories: AllConsentNames[],
	allowedPurposeIds?: string[] | null
): AllConsentNames[];
/**
 * Applies policy scope to runtime gating behavior.
 *
 * Out-of-policy categories are treated as permissive by c15t runtime and are
 * therefore granted for gating decisions (scripts/iframes load normally).
 */
export declare function applyPolicyScopeForRuntimeGating(
	consents: ConsentState,
	allowedPurposeIds?: string[] | null,
	scopeMode?: 'strict' | 'permissive' | null
): ConsentState;
/**
 * Gets the runtime policy returned by /init, if present.
 */
export declare function getEffectivePolicy(
	initData?: InitOutput | null
): ResolvedPolicy | undefined;
/**
 * Validates UI state against backend policy constraints.
 */
export declare function validateUIAgainstPolicy(params: {
	policy?: ResolvedPolicy;
	state: PolicyUIState;
}): PolicyValidationIssue[];
export {};
