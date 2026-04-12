import {
	type ConsentPolicy,
	consentPolicySchema,
	type LegalDocumentPolicyType,
	legalDocumentPolicyTypeSchema,
	type PolicyType,
	policyTypeSchema,
} from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const consentPolicyTable = table('consentPolicy', {
	id: idColumn('id', 'varchar(255)'),
	version: column('version', 'string'),
	type: column('type', 'string'),
	hash: column('hash', 'string').nullable(),
	effectiveDate: column('effectiveDate', 'timestamp'),
	isActive: column('isActive', 'bool').defaultTo$(() => true),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
	tenantId: column('tenantId', 'string').nullable(),
});

// Re-export for backward compatibility
export {
	type ConsentPolicy,
	consentPolicySchema,
	type LegalDocumentPolicyType,
	legalDocumentPolicyTypeSchema,
	type PolicyType,
	policyTypeSchema,
};

// Backward compatible alias
export const PolicyTypeSchema = policyTypeSchema;
