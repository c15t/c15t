export type {
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
} from '@c15t/core';
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
} from '@c15t/core';
export { resolveConsentPresentation } from '@c15t/core';
export type {
	ConsentPresentation,
	PromptPresentation,
	PreferencesPresentation,
	SurfacePresentation,
	PresentationAction,
	PresentationDiagnostic,
	ResolvedConsentPresentation,
} from '@c15t/core';
