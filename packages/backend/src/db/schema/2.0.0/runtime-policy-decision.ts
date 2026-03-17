import {
	type RuntimePolicyDecision,
	runtimePolicyDecisionSchema,
} from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const runtimePolicyDecisionTable = table('runtimePolicyDecision', {
	id: idColumn('id', 'varchar(255)'),
	tenantId: column('tenantId', 'string').nullable(),
	policyId: column('policyId', 'string'),
	fingerprint: column('fingerprint', 'string'),
	matchedBy: column('matchedBy', 'string'),
	countryCode: column('countryCode', 'string').nullable(),
	regionCode: column('regionCode', 'string').nullable(),
	jurisdiction: column('jurisdiction', 'string'),
	language: column('language', 'string').nullable(),
	model: column('model', 'string'),
	policyI18n: column('policyI18n', 'json').nullable(),
	uiMode: column('uiMode', 'string').nullable(),
	bannerUi: column('bannerUi', 'json').nullable(),
	dialogUi: column('dialogUi', 'json').nullable(),
	categories: column('categories', 'json').nullable(),
	preselectedCategories: column('preselectedCategories', 'json').nullable(),
	proofConfig: column('proofConfig', 'json').nullable(),
	dedupeKey: column('dedupeKey', 'string').unique(),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
});

export { runtimePolicyDecisionSchema, type RuntimePolicyDecision };
