import { policyRegistry } from './consent-policy';
import { consentPurposeRegistry } from './consent-purpose';
import { domainRegistry } from './domain';
import { subjectRegistry } from './subject';
import type { Registry } from './types';

export const createRegistry = (ctx: Registry) => {
	return {
		...subjectRegistry(ctx),
		...consentPurposeRegistry(ctx),
		...policyRegistry(ctx),
		...domainRegistry(ctx),
	};
};
