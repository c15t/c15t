import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

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
});

export const consentStatusSchema = z.enum(['active', 'withdrawn', 'expired']);

export const consentSchema = z.object({
	id: z.string(),
	subjectId: z.string(),
	domainId: z.string(),
	purposeIds: z.array(z.string()),
	metadata: z.record(z.string(), z.unknown()).nullish(),
	policyId: z.string().optional(),
	ipAddress: z.string().nullish(),
	userAgent: z.string().nullish(),
	status: consentStatusSchema.prefault('active'),
	withdrawalReason: z.string().nullish(),
	givenAt: z.date().prefault(() => new Date()),
	validUntil: z.date().nullish(),
	isActive: z.boolean().prefault(true),
});

export type Consent = z.infer<typeof consentSchema>;
