import {
	type Consent,
	type ConsentStatus,
	consentSchema,
	consentStatusSchema,
} from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const consentTable = table('consent', {
	id: idColumn('id', 'varchar(255)'),
	subjectId: column('subjectId', 'string'),
	domainId: column('domainId', 'string'),
	policyId: column('policyId', 'string').nullable(),
	purposeIds: column('purposeIds', 'json'),
	metadata: column('metadata', 'json').nullable(),
	ipAddress: column('ipAddress', 'string').nullable(),
	userAgent: column('userAgent', 'string').nullable(),
	status: column('status', 'string').defaultTo$(() => 'active'),
	withdrawalReason: column('withdrawalReason', 'string').nullable(),
	givenAt: column('givenAt', 'timestamp').defaultTo$('now'),
	validUntil: column('validUntil', 'timestamp').nullable(),
	isActive: column('isActive', 'bool').defaultTo$(() => true),
	/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
	jurisdiction: column('jurisdiction', 'string').nullable(),
	/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
	jurisdictionModel: column('jurisdictionModel', 'string').nullable(),
	/** IAB TCF TC String (only for IAB consents) */
	tcString: column('tcString', 'string').nullable(),
});

export { consentSchema, consentStatusSchema, type Consent, type ConsentStatus };
