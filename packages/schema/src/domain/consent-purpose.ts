import * as v from 'valibot';

export const consentPurposeSchema = v.object({
	id: v.string(),
	code: v.string(),
	name: v.string(),
	description: v.string(),
	isEssential: v.boolean(),
	dataCategory: v.nullish(v.string()),
	legalBasis: v.nullish(v.string()),
	isActive: v.optional(v.boolean(), true),
	createdAt: v.optional(v.date(), () => new Date()),
	updatedAt: v.optional(v.date(), () => new Date()),
});

export type ConsentPurpose = v.InferOutput<typeof consentPurposeSchema>;
