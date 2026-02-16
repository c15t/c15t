import * as v from 'valibot';

export const subjectSchema = v.object({
	id: v.string(),
	externalId: v.nullish(v.string()),
	identityProvider: v.nullish(v.string()),
	createdAt: v.optional(v.date(), () => new Date()),
	updatedAt: v.optional(v.date(), () => new Date()),
	tenantId: v.nullish(v.string()),
});

export type Subject = v.InferOutput<typeof subjectSchema>;
