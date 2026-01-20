import { type AuditLog, auditLogSchema } from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const auditLogTable = table('auditLog', {
	id: idColumn('id', 'varchar(255)'),
	entityType: column('entityType', 'string'),
	entityId: column('entityId', 'string'),
	actionType: column('actionType', 'string'),
	subjectId: column('subjectId', 'string').nullable(),
	ipAddress: column('ipAddress', 'string').nullable(),
	userAgent: column('userAgent', 'string').nullable(),
	changes: column('changes', 'json').nullable(),
	metadata: column('metadata', 'json').nullable(),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
	eventTimezone: column('eventTimezone', 'string').defaultTo$(() => 'UTC'),
});

export { auditLogSchema, type AuditLog };
