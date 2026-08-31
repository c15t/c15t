import * as v from 'valibot';

export const domainSchema = v.object({
	createdAt: v.optional(v.date(), () => new Date()),
	id: v.string(),
	name: v.string(),
	tenantId: v.nullish(v.string()),
	updatedAt: v.optional(v.date(), () => new Date()),
});

export type Domain = v.InferOutput<typeof domainSchema>;
