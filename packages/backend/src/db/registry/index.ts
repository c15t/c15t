import { policyRegistry } from './consent-policy';
import { consentPurposeRegistry } from './consent-purpose';
import { domainRegistry } from './domain';
import { runtimePolicyDecisionRegistry } from './runtime-policy-decision';
import { subjectRegistry } from './subject';
import type { Registry } from './types';

export const createRegistry = (ctx: Registry) => {
	return {
		...subjectRegistry(ctx),
		...consentPurposeRegistry(ctx),
		...policyRegistry(ctx),
		...domainRegistry(ctx),
		...runtimePolicyDecisionRegistry(ctx),
	};
};
