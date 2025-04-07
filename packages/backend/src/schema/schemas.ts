import type { z } from 'zod';
import {
	auditLogSchema,
	consentPolicySchema,
	consentRecordSchema,
	consentSchema,
	domainSchema,
	purposeSchema,
	subjectSchema,
} from './index';

// Export all schemas
export const schemas = {
	auditLog: auditLogSchema,
	consent: consentSchema,
	consentPolicy: consentPolicySchema,
	consentPurpose: purposeSchema,
	consentRecord: consentRecordSchema,
	domain: domainSchema,
	subject: subjectSchema,
} as const;

// Type for all table names
export type TableName = keyof typeof schemas;

// Type for inferring the shape of any table
export type InferTableShape<T extends TableName> = z.infer<(typeof schemas)[T]>;
