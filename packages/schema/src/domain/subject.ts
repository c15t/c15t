import * as v from 'valibot';

export const subjectSchema = v.object({
	createdAt: v.optional(v.date(), () => new Date()),
	externalId: v.nullish(v.string()),
	id: v.string(),
	identityProvider: v.nullish(v.string()),
	tenantId: v.nullish(v.string()),
	updatedAt: v.optional(v.date(), () => new Date()),
});

export type Subject = v.InferOutput<typeof subjectSchema>;
