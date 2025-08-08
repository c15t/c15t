import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

export const auditLogTable = table('auditLog', {
	id: idColumn('id', 'varchar(255)', { default: 'auto' }),
	entityType: column('entityType', 'string'),
	entityId: column('entityId', 'string'),
	actionType: column('actionType', 'string'),
	subjectId: column('subjectId', 'string', { nullable: true }),
	ipAddress: column('ipAddress', 'string', { nullable: true }),
	userAgent: column('userAgent', 'string', { nullable: true }),
	changes: column('changes', 'json', { nullable: true }),
	metadata: column('metadata', 'json', { nullable: true }),
	createdAt: column('createdAt', 'timestamp', { default: 'now' }),
	eventTimezone: column('eventTimezone', 'string'),
});

export const auditLogSchema = z.object({
	id: z.string(),
	entityType: z.string(),
	entityId: z.string(),
	actionType: z.string(),
	subjectId: z.string().optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
	changes: z.record(z.unknown()).optional(),
	metadata: z.record(z.unknown()).optional(),
	createdAt: z.date().default(() => new Date()),
	eventTimezone: z.string().default('UTC'),
});

export type AuditLog = z.infer<typeof auditLogSchema>;
