import * as v from 'valibot';

export const domainSchema = v.object({
	id: v.string(),
	name: v.string(),
	createdAt: v.optional(v.date(), () => new Date()),
	updatedAt: v.optional(v.date(), () => new Date()),
	tenantId: v.nullish(v.string()),
});

export type Domain = v.InferOutput<typeof domainSchema>;
