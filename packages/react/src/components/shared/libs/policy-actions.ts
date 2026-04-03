/**
 * Re-exported from c15t core for backward compatibility.
 * @see packages/core/src/libs/policy-actions.ts
 */

export type {
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
} from 'c15t';
export {
	flattenPolicyActionGroups,
	hasPolicyHints,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyOrderedActions,
	resolvePolicyPrimaryActions,
	resolvePolicyUiProfile,
	shouldFillPolicyActions,
} from 'c15t';
