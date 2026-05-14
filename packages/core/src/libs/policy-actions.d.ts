/**
 * Policy-driven action resolution utilities.
 *
 * Pure functions that resolve backend policy hints into button layouts
 * for consent surfaces (banner, dialog). Used by c15t UI runtimes to
 * determine which buttons to show and how to arrange them.
 *
 * @packageDocumentation
 */
import type {
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
} from '../store/type';
export type {
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
};
export declare function resolvePolicyAllowedActions(params: {
	allowedActions?: PolicyUiAction[];
}): PolicyUiAction[];
export declare function flattenPolicyActionGroups(
	layout?: PolicyUiActionGroup[]
): PolicyUiAction[];
export declare function resolvePolicyActionGroups(params: {
	allowedActions: PolicyUiAction[];
	layout?: PolicyUiActionGroup[];
}): PolicyUiAction[][];
export declare function resolvePolicyOrderedActions(params: {
	allowedActions: PolicyUiAction[];
	layout?: PolicyUiActionGroup[];
}): PolicyUiAction[];
export declare function resolvePolicyPrimaryActions(params: {
	orderedActions: PolicyUiAction[];
	primaryActions?: PolicyUiAction[];
}): PolicyUiAction[];
export declare function resolvePolicyDirection(
	direction?: PolicyUiActionDirection
): PolicyUiActionDirection;
export declare function resolvePolicyUiProfile(
	profile?: PolicyUiProfile
): PolicyUiProfile;
export declare function shouldFillPolicyActions(params: {
	uiProfile?: PolicyUiProfile;
	actionGroups: PolicyUiAction[][];
	direction?: PolicyUiActionDirection;
}): boolean;
export declare function hasPolicyHints(
	surface?: PolicyUiSurfaceConfig
): boolean;
