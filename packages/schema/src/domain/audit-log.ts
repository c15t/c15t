import * as v from 'valibot';

export const auditLogSchema = v.object({
	id: v.string(),
	entityType: v.string(),
	entityId: v.string(),
	actionType: v.string(),
	subjectId: v.optional(v.string()),
	ipAddress: v.optional(v.string()),
	userAgent: v.optional(v.string()),
	changes: v.optional(v.record(v.string(), v.unknown())),
	metadata: v.optional(v.record(v.string(), v.unknown())),
	createdAt: v.optional(v.date(), () => new Date()),
	eventTimezone: v.optional(v.string(), 'UTC'),
});

export type AuditLog = v.InferOutput<typeof auditLogSchema>;
