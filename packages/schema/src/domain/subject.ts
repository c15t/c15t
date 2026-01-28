import * as v from 'valibot';

export const subjectSchema = v.object({
	id: v.string(),
	isIdentified: v.optional(v.boolean(), false),
	externalId: v.nullish(v.string()),
	identityProvider: v.nullish(v.string()),
	lastIpAddress: v.optional(v.string()),
	subjectTimezone: v.nullish(v.string()),
	createdAt: v.optional(v.date(), () => new Date()),
	updatedAt: v.optional(v.date(), () => new Date()),
});

export type Subject = v.InferOutput<typeof subjectSchema>;
