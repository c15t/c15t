import { schema } from 'fumadb/schema';
import { auditLogTable } from './audit-log';
import { consentTable } from './consent';
import { consentPolicyTable } from './consent-policy';
import { consentPurposeTable } from './consent-purpose';
import { consentRecordTable } from './consent-record';
import { domainTable } from './domain';
import { subjectTable } from './subject';

export const v1 = schema({
	version: '1.0.0',
	tables: {
		subject: subjectTable,
		domain: domainTable,
		consentPolicy: consentPolicyTable,
		consentPurpose: consentPurposeTable,
		consent: consentTable,
		auditLog: auditLogTable,
		consentRecord: consentRecordTable,
	},
	relations: {
		subject: ({ many }) => ({
			consents: many('consent'),
			consentRecords: many('consentRecord'),
			auditLogs: many('auditLog'),
		}),
		domain: ({ many }) => ({
			consents: many('consent'),
		}),
		consentPolicy: ({ many }) => ({
			consents: many('consent'),
		}),
		consentPurpose: () => ({}),
		consent: ({ one, many }) => ({
			subject: one('subject', ['subjectId', 'id']).foreignKey(),
			domain: one('domain', ['domainId', 'id']).foreignKey(),
			policy: one('consentPolicy', ['policyId', 'id']).foreignKey(),
			consentRecords: many('consentRecord'),
		}),
		consentRecord: ({ one }) => ({
			subject: one('subject', ['subjectId', 'id']).foreignKey(),
			consent: one('consent', ['consentId', 'id']).foreignKey(),
		}),
		auditLog: ({ one }) => ({
			subject: one('subject', ['subjectId', 'id']).foreignKey(),
		}),
	},
});

export * from './audit-log';
export * from './consent';
export * from './consent-policy';
export * from './consent-purpose';
export * from './consent-record';
export * from './domain';
export * from './subject';
