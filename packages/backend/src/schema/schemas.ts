import type { z } from 'zod';
import {
	auditLogSchema,
	consentGeoLocationSchema,
	consentPolicySchema,
	consentPurposeJunctionSchema,
	consentRecordSchema,
	consentSchema,
	consentWithdrawalSchema,
	domainSchema,
	geoLocationSchema,
	purposeSchema,
	subjectSchema,
} from './index';

// Export all schemas
export const schemas = {
	auditLog: auditLogSchema,
	consent: consentSchema,
	consentGeoLocation: consentGeoLocationSchema,
	consentPolicy: consentPolicySchema,
	consentPurpose: purposeSchema,
	consentPurposeJunction: consentPurposeJunctionSchema,
	consentRecord: consentRecordSchema,
	consentWithdrawal: consentWithdrawalSchema,
	domain: domainSchema,
	geoLocation: geoLocationSchema,
	subject: subjectSchema,
} as const;

// Type for all table names
export type TableName = keyof typeof schemas;

// Type for inferring the shape of any table
export type InferTableShape<T extends TableName> = z.infer<(typeof schemas)[T]>;
