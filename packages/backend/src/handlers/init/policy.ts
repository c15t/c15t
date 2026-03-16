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
	policies: unknown,
	options?: { iabEnabled?: boolean }
): PolicyValidationResult {
	return inspectPoliciesShared(policies, options);
}

export function validatePolicies(
	policies: unknown,
	options?: { iabEnabled?: boolean }
): void {
	validatePoliciesShared(policies, options);
}

export async function resolvePolicyDecision(params: {
	policies?: unknown;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction?: BackendJurisdictionCode;
	iabEnabled?: boolean;
}): Promise<ResolvedPolicyDecision | undefined> {
	return resolvePolicyDecisionShared({
		policies: params.policies,
		countryCode: params.countryCode,
		regionCode: params.regionCode,
		jurisdiction: params.jurisdiction as SharedJurisdictionCode | undefined,
		iabEnabled: params.iabEnabled,
	}) as Promise<ResolvedPolicyDecision | undefined>;
}
