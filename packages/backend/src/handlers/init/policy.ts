import type {
	PolicyMatchedBy,
	PolicyValidationResult,
	JurisdictionCode as SharedJurisdictionCode,
	PolicyConfig as SharedPolicyConfig,
	ResolvedPolicyDecision as SharedResolvedPolicyDecision,
	ResolvedPolicy as SharedResolvedRuntimePolicy,
} from '@c15t/schema/types';
import {
	inspectPolicies as inspectPoliciesShared,
	resolvePolicyDecision as resolvePolicyDecisionShared,
	validatePolicies as validatePoliciesShared,
} from '@c15t/schema/types';
import type {
	JurisdictionCode as BackendJurisdictionCode,
	PolicyConfig as BackendPolicyConfig,
} from '~/types';

export type { PolicyMatchedBy, PolicyValidationResult };
export type ResolvedRuntimePolicy = SharedResolvedRuntimePolicy;
export type ResolvedPolicyDecision = SharedResolvedPolicyDecision;

export function inspectPolicies(
	policies: BackendPolicyConfig[],
	options?: { iabEnabled?: boolean }
): PolicyValidationResult {
	return inspectPoliciesShared(policies as SharedPolicyConfig[], options);
}

export function validatePolicies(
	policies: BackendPolicyConfig[],
	options?: { iabEnabled?: boolean }
): void {
	validatePoliciesShared(policies as SharedPolicyConfig[], options);
}

export async function resolvePolicyDecision(params: {
	policies?: BackendPolicyConfig[];
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction: BackendJurisdictionCode;
}): Promise<ResolvedPolicyDecision | undefined> {
	return resolvePolicyDecisionShared({
		policies: params.policies as SharedPolicyConfig[] | undefined,
		countryCode: params.countryCode,
		regionCode: params.regionCode,
		jurisdiction: params.jurisdiction as SharedJurisdictionCode,
	}) as Promise<ResolvedPolicyDecision | undefined>;
}
