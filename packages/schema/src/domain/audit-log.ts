import * as v from 'valibot';

export const auditLogSchema = v.object({
	actionType: v.string(),
	changes: v.optional(v.record(v.string(), v.unknown())),
	createdAt: v.optional(v.date(), () => new Date()),
	entityId: v.string(),
	entityType: v.string(),
	id: v.string(),
	ipAddress: v.optional(v.string()),
	metadata: v.optional(v.record(v.string(), v.unknown())),
	subjectId: v.optional(v.string()),
	tenantId: v.nullish(v.string()),
	userAgent: v.optional(v.string()),
});

export type AuditLog = v.InferOutput<typeof auditLogSchema>;
