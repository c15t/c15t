import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

export const consentTable = table('consent', {
	id: idColumn('id', 'varchar(255)').defaultTo$('auto'),
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
	metadata: z.record(z.unknown()).nullable().optional(),
	policyId: z.string().optional(),
	ipAddress: z.string().nullable().optional(),
	userAgent: z.string().nullable().optional(),
	status: consentStatusSchema.default('active'),
	withdrawalReason: z.string().nullable().optional(),
	givenAt: z.date().default(() => new Date()),
	validUntil: z.date().nullable().optional(),
	isActive: z.boolean().default(true),
});

export type Consent = z.infer<typeof consentSchema>;
