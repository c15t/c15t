import * as v from 'valibot';
export declare const auditLogSchema: v.ObjectSchema<
	{
		readonly id: v.StringSchema<undefined>;
		readonly entityType: v.StringSchema<undefined>;
		readonly entityId: v.StringSchema<undefined>;
		readonly actionType: v.StringSchema<undefined>;
		readonly subjectId: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly ipAddress: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly userAgent: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly changes: v.OptionalSchema<
			v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>,
			undefined
		>;
		readonly metadata: v.OptionalSchema<
			v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>,
			undefined
		>;
		readonly createdAt: v.OptionalSchema<v.DateSchema<undefined>, () => Date>;
		readonly tenantId: v.NullishSchema<v.StringSchema<undefined>, undefined>;
	},
	undefined
>;
export type AuditLog = v.InferOutput<typeof auditLogSchema>;
