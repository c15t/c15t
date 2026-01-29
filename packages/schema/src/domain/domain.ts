import * as v from 'valibot';

export const domainSchema = v.object({
	id: v.string(),
	name: v.string(),
	description: v.nullish(v.string()),
	allowedOrigins: v.nullish(v.array(v.string())),
	isVerified: v.optional(v.boolean(), true),
	isActive: v.optional(v.boolean(), true),
	createdAt: v.optional(v.date(), () => new Date()),
	updatedAt: v.optional(v.date(), () => new Date()),
});

export type Domain = v.InferOutput<typeof domainSchema>;
