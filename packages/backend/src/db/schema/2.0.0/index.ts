import { schema } from 'fumadb/schema';
import { auditLogTable } from './audit-log';
import { consentTable } from './consent';
import { consentPolicyTable } from './consent-policy';
import { consentPurposeTable } from './consent-purpose';
import { domainTable } from './domain';
import { runtimePolicyDecisionTable } from './runtime-policy-decision';
import { subjectTable } from './subject';

export const v2 = schema({
	version: '2.0.0',
	tables: {
		subject: subjectTable,
		domain: domainTable,
		consentPolicy: consentPolicyTable,
		runtimePolicyDecision: runtimePolicyDecisionTable,
		consentPurpose: consentPurposeTable,
		consent: consentTable,
		auditLog: auditLogTable,
	},
	relations: {
		subject: ({ many }) => ({
			consents: many('consent'),
			auditLogs: many('auditLog'),
		}),
		domain: ({ many }) => ({
			consents: many('consent'),
		}),
		consentPolicy: ({ many }) => ({
			consents: many('consent'),
		}),
		runtimePolicyDecision: ({ many }) => ({
			consents: many('consent'),
		}),
		consentPurpose: () => ({}),
		consent: ({ one }) => ({
			subject: one('subject', ['subjectId', 'id']).foreignKey(),
			domain: one('domain', ['domainId', 'id']).foreignKey(),
			policy: one('consentPolicy', ['policyId', 'id']).foreignKey(),
			runtimePolicyDecision: one('runtimePolicyDecision', [
				'runtimePolicyDecisionId',
				'id',
			]).foreignKey(),
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
export * from './domain';
export * from './runtime-policy-decision';
export * from './subject';
