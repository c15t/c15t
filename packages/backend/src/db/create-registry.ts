import type { RegistryContext } from '~/pkgs/types';

import {
	auditLogRegistry,
	consentGeoLocationRegistry,
	consentPurposeJunctionRegistry,
	consentPurposeRegistry,
	consentRecordRegistry,
	consentRegistry,
	consentWithdrawalRegistry,
	domainRegistry,
	geoLocationRegistry,
	policyRegistry,
	subjectRegistry,
} from './schema/index';

export const createRegistry = (ctx: RegistryContext) => {
	return {
		...auditLogRegistry(ctx),
		...consentRegistry(ctx),
		...domainRegistry(ctx),
		...geoLocationRegistry(ctx),
		...consentGeoLocationRegistry(ctx),
		...consentPurposeJunctionRegistry(ctx),
		...consentPurposeRegistry(ctx),
		...policyRegistry(ctx),
		...consentRecordRegistry(ctx),
		...subjectRegistry(ctx),
		...consentWithdrawalRegistry(ctx),
	};
};
