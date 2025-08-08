import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

export const consentTable = table('consent', {
	id: idColumn('id', 'varchar(255)', { default: 'auto' }),
	subjectId: column('subjectId', 'string'),
	domainId: column('domainId', 'string'),
	policyId: column('policyId', 'string', { nullable: true }),
	purposeIds: column('purposeIds', 'json'),
	metadata: column('metadata', 'json', { nullable: true }),
	ipAddress: column('ipAddress', 'string', { nullable: true }),
	userAgent: column('userAgent', 'string', { nullable: true }),
	status: column('status', 'string'),
	withdrawalReason: column('withdrawalReason', 'string', { nullable: true }),
	givenAt: column('givenAt', 'timestamp', { default: 'now' }),
	validUntil: column('validUntil', 'timestamp', { nullable: true }),
	isActive: column('isActive', 'bool'),
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
