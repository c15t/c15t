import { z } from 'zod';

export const auditLogSchema = z.object({
	id: z.string(),
	entityType: z.string(),
	entityId: z.string(),
	actionType: z.string(),
	subjectId: z.string().optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
	changes: z.record(z.string(), z.unknown()).optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	createdAt: z.date().prefault(() => new Date()),
	eventTimezone: z.string().prefault('UTC'),
});

export type AuditLog = z.infer<typeof auditLogSchema>;
